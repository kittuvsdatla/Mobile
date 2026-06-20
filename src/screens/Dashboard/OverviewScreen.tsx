import React, { useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { RootState, AppDispatch } from '@/store';
import { fetchDashboardStats } from '@/store/slices/reportsSlice';
import { fetchLowAlerts } from '@/store/slices/stockSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import type { DashboardDrawerParamList } from '@/types';

type Nav = DrawerNavigationProp<DashboardDrawerParamList>;

const STAT_CARDS = [
  { key: 'customerCount', label: 'Customers', icon: '👥', color: '#0daadaff', tab: 'Parties' as const },
  { key: 'supplierCount', label: 'Suppliers', icon: '🚚', color: '#8b5cf6', tab: 'Parties' as const },
  { key: 'productCount', label: 'Products', icon: '📦', color: '#22c55e', tab: 'Products' as const },
  { key: 'salesCount', label: 'Sales', icon: '💰', color: '#f16a0a', tab: 'Sales' as const },
  { key: 'purchasesCount', label: 'Purchases', icon: '🛒', color: '#084e60ff', tab: 'Purchases' as const },
  { key: 'totalDuesBalance', label: 'Pending Dues', icon: '💳', color: '#ef4444', tab: 'Dues' as const, prefix: '₹' },
];

export default function OverviewScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<Nav>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { dashboardStats, isLoading } = useSelector((state: RootState) => state.reports);
  const { lowStockAlerts } = useSelector((state: RootState) => state.stock);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = () => {
    dispatch(fetchDashboardStats());
    dispatch(fetchLowAlerts());
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  if (isLoading && !dashboardStats) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <Text style={styles.welcomeText}>Good day, {user?.name?.split(' ')[0]}! 👋</Text>
        <Text style={styles.welcomeSub}>{user?.entityName || 'BusinessApp Dashboard'}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {STAT_CARDS.map(card => {
          const rawValue = dashboardStats?.[card.key] ?? 0;
          const displayValue = card.prefix
            ? `${card.prefix}${Number(rawValue).toLocaleString()}`
            : String(rawValue);

          return (
            <TouchableOpacity
              key={card.key}
              style={[styles.statCard, { backgroundColor: card.color }]}
              onPress={() => navigation.navigate(card.tab)}
              activeOpacity={0.85}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.statIcon}>{card.icon}</Text>
              </View>
              <Text style={styles.statValue}>{displayValue}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Card style={styles.alertCard} padding={16}>
          <Text style={styles.alertTitle}>⚠️  Low Stock Alerts ({lowStockAlerts.length})</Text>
          {lowStockAlerts.map(item => (
            <View key={item.id} style={styles.alertRow}>
              <Text style={styles.alertProduct}>{item.product.name}</Text>
              <View style={styles.alertQtyBadge}>
                <Text style={styles.alertQty}>{item.quantity} {item.product.unitType}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* (Quick Actions removed — stat cards above already serve as navigation) */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  welcomeBanner: { backgroundColor: '#f16a0a', borderRadius: 16, padding: 20, marginBottom: 20 },
  welcomeText: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  welcomeSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '48%', borderRadius: 14, padding: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  iconContainer: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 10, padding: 6, alignSelf: 'flex-start', marginBottom: 8, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  alertCard: { marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  alertTitle: { fontSize: 15, fontWeight: '700', color: '#92400e', marginBottom: 12 },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fef3c7' },
  alertProduct: { fontSize: 14, fontWeight: '600', color: '#374151' },
  alertQtyBadge: { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  alertQty: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: '48%', backgroundColor: '#ffffff', borderRadius: 14, padding: 16, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, borderWidth: 1, borderColor: '#f3f4f6' },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
});
