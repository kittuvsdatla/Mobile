import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, Alert, SafeAreaView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { logoutUser }    from '@/store/slices/authSlice';
import { apiService }    from '@/services/apiService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState }     from '@/components/ui/EmptyState';
import { Badge }          from '@/components/ui/Badge';
import { Modal }          from '@/components/ui/Modal';
import { Button }         from '@/components/ui/Button';
import type { BusinessEntity } from '@/types';

type StatusFilter = 'all' | 'pending' | 'active' | 'expired' | 'suspended';

const STATUS_BADGE: Record<string, any> = {
  pending: 'warning', active: 'success', expired: 'danger', suspended: 'danger',
};

export default function AdminScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const [entities,   setEntities]   = useState<BusinessEntity[]>([]);
  const [stats,      setStats]      = useState<any | null>(null);
  const [filter,     setFilter]     = useState<StatusFilter>('all');
  const [isLoading,  setIsLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,   setSelected]   = useState<BusinessEntity | null>(null);
  const [isActing,   setIsActing]   = useState(false);

  const loadData = async () => {
    try {
      const [statsRes, entRes] = await Promise.all([
        apiService.admin.getDashboard(),
        apiService.admin.getEntities(filter === 'all' ? undefined : filter),
      ]);
      if (statsRes.success && statsRes.data) { setStats(statsRes.data); }
      if (entRes.success && entRes.data)     { setEntities(entRes.data); }
    } catch {
      // no-op
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleApprove = async (id: string) => {
    Alert.alert('Approve Business', 'Activate this business account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: async () => {
          setIsActing(true);
          await apiService.admin.approveEntity(id);
          setIsActing(false);
          setSelected(null);
          loadData();
        },
      },
    ]);
  };

  const handleSuspend = async (id: string) => {
    Alert.alert('Suspend Business', 'This will disable access for all users of this business.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Suspend', style: 'destructive', onPress: async () => {
          setIsActing(true);
          await apiService.admin.suspendEntity(id);
          setIsActing(false);
          setSelected(null);
          loadData();
        },
      },
    ]);
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete Business', '⚠️ This permanently deletes all data. Cannot be undone!', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setIsActing(true);
          await apiService.admin.deleteEntity(id);
          setIsActing(false);
          setSelected(null);
          loadData();
        },
      },
    ]);
  };

  if (isLoading) { return <LoadingSpinner message="Loading admin dashboard..." />; }

  return (
    <SafeAreaView style={styles.container}>
      {/* Admin Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛡 Super Admin</Text>
          <Text style={styles.headerSub}>BusinessApp Control Panel</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(logoutUser())}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Banner */}
        {stats && (
          <View style={styles.statsRow}>
            {[
              { label: 'Total',     value: stats.totalEntities   || entities.length },
              { label: 'Pending',   value: stats.pendingEntities || entities.filter(e => e.status === 'pending').length },
              { label: 'Active',    value: stats.activeEntities  || entities.filter(e => e.status === 'active').length },
              { label: 'Expired',   value: stats.expiredEntities || entities.filter(e => e.status === 'expired').length },
            ].map(s => (
              <View key={s.label} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {(['all', 'pending', 'active', 'expired', 'suspended'] as StatusFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTxt, filter === f && styles.filterTxtActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Entity List */}
        <Text style={styles.sectionTitle}>{entities.length} Businesses</Text>
        {entities.length === 0 ? (
          <EmptyState icon="🏢" title="No businesses found" />
        ) : (
          entities.map(entity => (
            <TouchableOpacity
              key={entity.id}
              style={styles.card}
              onPress={() => setSelected(entity)}
              activeOpacity={0.85}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <View style={styles.entityIcon}>
                    <Text style={styles.entityIconText}>{entity.companyName.charAt(0)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.companyName} numberOfLines={1}>{entity.companyName}</Text>
                    <Text style={styles.ownerName}>{entity.ownerName}</Text>
                    <Text style={styles.phone}>📞 {entity.phone}</Text>
                    <Text style={styles.joinDate}>
                      Joined: {new Date(entity.createdAt).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                </View>
                <Badge label={entity.status} variant={STATUS_BADGE[entity.status] || 'neutral'} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Entity Detail Modal */}
      <Modal
        visible={!!selected}
        onClose={() => setSelected(null)}
        title="Business Details"
      >
        {selected && (
          <View>
            <Text style={styles.detailName}>{selected.companyName}</Text>
            <Text style={styles.detailOwner}>Owner: {selected.ownerName}</Text>

            {[
              { label: 'Phone',   value: selected.phone },
              { label: 'Email',   value: selected.email || '—' },
              { label: 'Address', value: selected.address },
              { label: 'GST No.', value: selected.gstNumber || '—' },
              { label: 'PAN No.', value: selected.panNumber || '—' },
              { label: 'Status',  value: selected.status },
              { label: 'Joined',  value: new Date(selected.createdAt).toLocaleDateString('en-IN') },
            ].map(d => (
              <View key={d.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{d.label}:</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}

            <View style={styles.actionGrid}>
              {selected.status === 'pending' && (
                <Button
                  title="✓ Approve"
                  variant="secondary"
                  onPress={() => handleApprove(selected.id)}
                  loading={isActing}
                  style={styles.actionGridBtn}
                />
              )}
              {selected.status === 'active' && (
                <Button
                  title="⏸ Suspend"
                  variant="outline"
                  onPress={() => handleSuspend(selected.id)}
                  loading={isActing}
                  style={styles.actionGridBtn}
                />
              )}
              <Button
                title="🗑 Delete"
                variant="danger"
                onPress={() => handleDelete(selected.id)}
                loading={isActing}
                style={styles.actionGridBtn}
              />
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#f9fafb' },
  header:          { backgroundColor: '#1f2937', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle:     { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  headerSub:       { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  logoutBtn:       { backgroundColor: '#374151', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  logoutText:      { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  screen:          { flex: 1 },
  content:         { padding: 16, paddingBottom: 32 },
  statsRow:        { flexDirection: 'row', backgroundColor: '#1f2937', borderRadius: 16, padding: 16, marginBottom: 20, gap: 8 },
  statItem:        { flex: 1, alignItems: 'center' },
  statValue:       { fontSize: 22, fontWeight: '800', color: '#f16a0a', marginBottom: 2 },
  statLabel:       { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  filterRow:       { marginBottom: 16 },
  filterContent:   { gap: 8 },
  filterBtn:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  filterBtnActive: { borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  filterTxt:       { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterTxtActive: { color: '#f16a0a' },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  card:            { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardRow:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardLeft:        { flex: 1, flexDirection: 'row', gap: 12 },
  entityIcon:      { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fef7ee', alignItems: 'center', justifyContent: 'center' },
  entityIconText:  { fontSize: 20, fontWeight: '800', color: '#f16a0a' },
  cardInfo:        { flex: 1, gap: 3 },
  companyName:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  ownerName:       { fontSize: 13, color: '#6b7280' },
  phone:           { fontSize: 12, color: '#9ca3af' },
  joinDate:        { fontSize: 11, color: '#d1d5db' },
  detailName:      { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 },
  detailOwner:     { fontSize: 15, color: '#6b7280', marginBottom: 16 },
  detailRow:       { flexDirection: 'row', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel:     { fontSize: 13, fontWeight: '700', color: '#374151', width: 72 },
  detailValue:     { fontSize: 13, color: '#6b7280', flex: 1 },
  actionGrid:      { flexDirection: 'column', gap: 10, marginTop: 16 },
  actionGridBtn:   { width: '100%' },
});
