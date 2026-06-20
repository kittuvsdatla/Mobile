/**
 * DuesScreen — Mobile version of the web DuesContent.
 * Shows:
 *   - Summary cards: Total Sales Dues (To Receive) / Total Purchase Dues (To Pay)
 *   - Tabs: Sales Dues (Customers) | Purchase Dues (Suppliers)
 *   - Status filter: All / Pending / Partial / Cleared
 *   - Search by customer/supplier name
 *   - Party cards with due details and "Record Payment" action
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Alert, Modal, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchDues, recordPayment } from '@/store/slices/duesSlice';
import { fetchCustomers, fetchSuppliers } from '@/store/slices/partiesSlice';
import { apiService }    from '@/services/apiService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState }    from '@/components/ui/EmptyState';
import type { Due }      from '@/types';

function fmt(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUS_FILTERS = ['All', 'Pending', 'Partial', 'Cleared'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];
const PAYMENT_MODES = ['Cash', 'UPI', 'Cheque', 'Bank Transfer'];

export default function DuesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { items: dues, isLoading } = useSelector((s: RootState) => s.dues);
  const { customers, suppliers }   = useSelector((s: RootState) => s.parties);

  const [tab,        setTab]        = useState<'SALES' | 'PURCHASE'>('SALES');
  const [statusFlt,  setStatusFlt]  = useState<StatusFilter>('All');
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Payment modal
  const [payDue,    setPayDue]    = useState<Due | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode,   setPayMode]   = useState('Cash');
  const [payNotes,  setPayNotes]  = useState('');
  const [paying,    setPaying]    = useState(false);

  const loadData = () => {
    dispatch(fetchDues(undefined));
    dispatch(fetchCustomers());
    dispatch(fetchSuppliers());
  };

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  // Split dues by type
  const salesDues    = dues.filter(d => d.type === 'SALE'     || d.type === 'sale'    );
  const purchaseDues = dues.filter(d => d.type === 'PURCHASE' || d.type === 'purchase');

  // Summary totals
  const totalSalesDue    = salesDues   .filter(d => d.status !== 'cleared').reduce((s, d) => s + (d.balance || 0), 0);
  const totalPurchaseDue = purchaseDues.filter(d => d.status !== 'cleared').reduce((s, d) => s + (d.balance || 0), 0);

  // Active list
  const activeDues = tab === 'SALES' ? salesDues : purchaseDues;

  // Apply status filter
  const statusFiltered = statusFlt === 'All'
    ? activeDues
    : activeDues.filter(d => d.status?.toLowerCase() === statusFlt.toLowerCase());

  // Apply search
  const filtered = statusFiltered.filter(d =>
    (d.partyName || '').toLowerCase().includes(search.toLowerCase())
  );

  const openPayModal = (due: Due) => {
    setPayDue(due);
    setPayAmount(String(due.balance || ''));
    setPayMode('Cash');
    setPayNotes('');
  };

  const handleRecordPayment = async () => {
    if (!payDue || !payAmount || Number(payAmount) <= 0) { return; }
    const amt = Number(payAmount);
    if (amt > (payDue.balance || 0)) {
      Alert.alert('Error', `Cannot exceed balance of ${fmt(payDue.balance || 0)}`);
      return;
    }
    setPaying(true);
    try {
      await dispatch(recordPayment({
        id:          payDue.id,
        amount:      amt,
        paymentMode: payMode,
        notes:       payNotes || undefined,
      })).unwrap();
      Alert.alert('✓ Payment Recorded', `${fmt(amt)} recorded for ${payDue.partyName}`);
      setPayDue(null);
      dispatch(fetchDues(undefined));
    } catch {
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  if (isLoading && !dues.length) { return <LoadingSpinner message="Loading dues..." />; }

  return (
    <View style={styles.screen}>
      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <TouchableOpacity
          style={[styles.summaryCard, tab === 'SALES' && styles.summaryCardActive]}
          onPress={() => setTab('SALES')}
          activeOpacity={0.8}
        >
          <Text style={styles.summaryIcon}>📈</Text>
          <Text style={styles.summaryTitle}>Total Sales Dues</Text>
          <Text style={styles.summarySubtitle}>(To Receive)</Text>
          <Text style={[styles.summaryAmt, { color: '#22c55e' }]}>{fmt(totalSalesDue)}</Text>
          <Text style={styles.summaryCount}>{salesDues.filter(d => d.status !== 'cleared').length} customers</Text>
        </TouchableOpacity>

        <View style={styles.summaryDivider} />

        <TouchableOpacity
          style={[styles.summaryCard, tab === 'PURCHASE' && styles.summaryCardActive]}
          onPress={() => setTab('PURCHASE')}
          activeOpacity={0.8}
        >
          <Text style={styles.summaryIcon}>📉</Text>
          <Text style={styles.summaryTitle}>Total Purchase Dues</Text>
          <Text style={styles.summarySubtitle}>(To Pay)</Text>
          <Text style={[styles.summaryAmt, { color: '#ef4444' }]}>{fmt(totalPurchaseDue)}</Text>
          <Text style={styles.summaryCount}>{purchaseDues.filter(d => d.status !== 'cleared').length} suppliers</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'SALES' && styles.tabActive]}
          onPress={() => setTab('SALES')}
        >
          <Text style={[styles.tabTxt, tab === 'SALES' && styles.tabTxtActive]}>
            Sales Dues (Customers)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'PURCHASE' && styles.tabActive]}
          onPress={() => setTab('PURCHASE')}
        >
          <Text style={[styles.tabTxt, tab === 'PURCHASE' && styles.tabTxtActive]}>
            Purchase Dues (Suppliers)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={tab === 'SALES' ? 'Search customers...' : 'Search suppliers...'}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {STATUS_FILTERS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFlt === s && styles.filterChipActive]}
            onPress={() => setStatusFlt(s)}
          >
            <Text style={[styles.filterTxt, statusFlt === s && styles.filterTxtActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Due Cards List */}
      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
        ListEmptyComponent={
          <EmptyState
            icon={tab === 'SALES' ? '💰' : '🛒'}
            title="No dues found"
            subtitle={`No ${statusFlt !== 'All' ? statusFlt.toLowerCase() + ' ' : ''}${tab === 'SALES' ? 'sales dues' : 'purchase dues'}`}
          />
        }
        renderItem={({ item }) => {
          const isCleared = item.status === 'cleared';
          const isPartial = item.status === 'partial';
          const statusColor = isCleared ? '#16a34a' : isPartial ? '#d97706' : '#ef4444';
          const statusBg    = isCleared ? '#dcfce7'  : isPartial ? '#fef3c7'  : '#fee2e2';
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarTxt}>{(item.partyName || '?').charAt(0)}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.partyName}>{item.partyName}</Text>
                    <Text style={styles.invoiceTxt}>{item.invoiceNumber || 'Direct Entry'}</Text>
                    {item.date ? <Text style={styles.dateTxt}>{fmtDate(item.date)}</Text> : null}
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                    <Text style={[styles.statusTxt, { color: statusColor }]}>
                      {(item.status || 'pending').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Amounts */}
              <View style={styles.amtRow}>
                <View style={styles.amtItem}>
                  <Text style={styles.amtLbl}>Total</Text>
                  <Text style={styles.amtVal}>{fmt(item.totalAmount || item.amount || 0)}</Text>
                </View>
                <View style={styles.amtItem}>
                  <Text style={styles.amtLbl}>Paid</Text>
                  <Text style={[styles.amtVal, { color: '#22c55e' }]}>{fmt(item.paidAmount || 0)}</Text>
                </View>
                <View style={styles.amtItem}>
                  <Text style={styles.amtLbl}>Balance</Text>
                  <Text style={[styles.amtVal, { color: '#ef4444', fontWeight: '800' }]}>{fmt(item.balance || 0)}</Text>
                </View>
              </View>

              {/* Pay button */}
              {!isCleared && (
                <TouchableOpacity style={styles.payBtn} onPress={() => openPayModal(item)}>
                  <Text style={styles.payTxt}>
                    {tab === 'SALES' ? '💰 Receive Payment' : '💸 Record Payment'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Payment Modal */}
      <Modal visible={!!payDue} animationType="slide" transparent onRequestClose={() => setPayDue(null)}>
        <TouchableOpacity style={styles.payOverlay} activeOpacity={1} onPress={() => setPayDue(null)}>
          <View style={styles.paySheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.payTitle}>
              {tab === 'SALES' ? '💰 Receive Payment' : '💸 Record Payment'}
            </Text>
            <Text style={styles.payParty}>{payDue?.partyName}</Text>
            <Text style={styles.payBalance}>Outstanding: {fmt(payDue?.balance || 0)}</Text>

            <Text style={styles.payLabel}>Amount (₹) *</Text>
            <TextInput
              style={styles.payInput}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
            />

            <Text style={styles.payLabel}>Payment Mode</Text>
            <View style={styles.modeGrid}>
              {PAYMENT_MODES.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeChip, payMode === m && styles.modeChipActive]}
                  onPress={() => setPayMode(m)}
                >
                  <Text style={[styles.modeChipTxt, payMode === m && styles.modeChipTxtActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.payLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.payInput}
              value={payNotes}
              onChangeText={setPayNotes}
              placeholder="Optional notes..."
              multiline
            />

            <View style={styles.payActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPayDue(null)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleRecordPayment} disabled={paying}>
                {paying
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmTxt}>Confirm</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:            { flex: 1, backgroundColor: '#f9fafb' },

  summaryRow:        { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  summaryCard:       { flex: 1, padding: 14, alignItems: 'center' },
  summaryCardActive: { borderBottomWidth: 3, borderBottomColor: '#f16a0a' },
  summaryIcon:       { fontSize: 20, marginBottom: 4 },
  summaryTitle:      { fontSize: 12, fontWeight: '700', color: '#374151', textAlign: 'center' },
  summarySubtitle:   { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  summaryAmt:        { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  summaryCount:      { fontSize: 11, color: '#9ca3af' },
  summaryDivider:    { width: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },

  tabBar:            { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab:               { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:         { borderBottomWidth: 3, borderBottomColor: '#f16a0a' },
  tabTxt:            { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  tabTxtActive:      { color: '#f16a0a' },

  searchRow:         { padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput:       { backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' },

  filterRow:         { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterContent:     { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  filterChip:        { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  filterChipActive:  { borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  filterTxt:         { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterTxtActive:   { color: '#f16a0a' },

  list:              { padding: 12, paddingBottom: 32 },
  card:              { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft:          { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  cardRight:         { alignItems: 'flex-end' },
  avatar:            { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarTxt:         { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
  cardInfo:          { flex: 1, gap: 2 },
  partyName:         { fontSize: 15, fontWeight: '700', color: '#111827' },
  invoiceTxt:        { fontSize: 12, color: '#f16a0a', fontWeight: '600' },
  dateTxt:           { fontSize: 12, color: '#9ca3af' },
  statusBadge:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:         { fontSize: 11, fontWeight: '700' },

  amtRow:            { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 10 },
  amtItem:           { flex: 1, alignItems: 'center' },
  amtLbl:            { fontSize: 11, color: '#9ca3af', fontWeight: '500', marginBottom: 3 },
  amtVal:            { fontSize: 14, fontWeight: '700', color: '#374151' },

  payBtn:            { backgroundColor: '#dcfce7', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  payTxt:            { fontSize: 13, fontWeight: '700', color: '#16a34a' },

  // Payment modal
  payOverlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  paySheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  payTitle:          { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 4 },
  payParty:          { fontSize: 15, fontWeight: '700', color: '#f16a0a', marginBottom: 2 },
  payBalance:        { fontSize: 13, color: '#ef4444', fontWeight: '600', marginBottom: 16 },
  payLabel:          { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  payInput:          { backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937' },
  modeGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  modeChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  modeChipActive:    { borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  modeChipTxt:       { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeChipTxtActive: { color: '#f16a0a' },
  payActions:        { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:         { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt:         { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  confirmBtn:        { flex: 2, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmTxt:        { fontSize: 15, fontWeight: '800', color: '#fff' },
});
