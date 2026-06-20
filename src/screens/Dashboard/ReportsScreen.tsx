/**
 * ReportsScreen — Mobile version with date range picker, party filter,
 * transaction type checkboxes, and PDF export.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { RootState, AppDispatch } from '@/store';
import {
  fetchDashboardStats, fetchSalesSummary, fetchPurchasesSummary, fetchDuesSummary,
} from '@/store/slices/reportsSlice';
import { fetchCustomers, fetchSuppliers } from '@/store/slices/partiesSlice';
import { apiService }     from '@/services/apiService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card }           from '@/components/ui/Card';
import type { DashboardDrawerParamList } from '@/types';

function fmt(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgo(d: number) {
  const dt = new Date(); dt.setDate(dt.getDate() - d);
  return dt.toISOString().split('T')[0];
}

const QUICK_RANGES = [
  { label: 'This Month', from: () => daysAgo(30),  to: todayStr },
  { label: '3 Months',   from: () => daysAgo(90),  to: todayStr },
  { label: '6 Months',   from: () => daysAgo(180), to: todayStr },
  { label: 'This Year',  from: () => daysAgo(365), to: todayStr },
  { label: 'All',        from: () => '2000-01-01', to: todayStr },
  { label: 'Custom',     from: () => daysAgo(30),  to: todayStr },
];

const TX_TYPES = [
  { key: 'SALE',     label: 'Sales' },
  { key: 'PURCHASE', label: 'Purchases' },
  { key: 'DUE',      label: 'Dues' },
  { key: 'PAYMENT',  label: 'Payments' },
] as const;

export default function ReportsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets   = useSafeAreaInsets();
  const navigation = useNavigation<DrawerNavigationProp<DashboardDrawerParamList>>();
  const { dashboardStats, salesSummary, purchaseSummary, duesSummary, isLoading } =
    useSelector((state: RootState) => state.reports);
  const { customers, suppliers } = useSelector((s: RootState) => s.parties);

  const [rangeIdx,   setRangeIdx]   = useState(0);
  const [fromDate,   setFromDate]   = useState(daysAgo(30));
  const [toDate,     setToDate]     = useState(todayStr());
  const [refreshing, setRefreshing] = useState(false);

  // Party filter
  const [partyId,      setPartyId]      = useState('');
  const [partySearch,  setPartySearch]  = useState('');
  const [showPartyPkr, setShowPartyPkr] = useState(false);

  // Transaction type checkboxes
  const [txTypes, setTxTypes] = useState<Record<string, boolean>>({
    SALE: true, PURCHASE: true, DUE: true, PAYMENT: true,
  });

  const allParties = [...customers, ...suppliers];
  const selectedParty = allParties.find(p => p.id === partyId);

  const loadData = useCallback(() => {
    dispatch(fetchDashboardStats({ from: fromDate, to: toDate }));
    dispatch(fetchSalesSummary({ from: fromDate, to: toDate }));
    dispatch(fetchPurchasesSummary({ from: fromDate, to: toDate }));
    dispatch(fetchDuesSummary());
    dispatch(fetchCustomers());
    dispatch(fetchSuppliers());
  }, [fromDate, toDate, dispatch]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const applyQuickRange = (idx: number) => {
    if (idx < QUICK_RANGES.length - 1) {
      const r = QUICK_RANGES[idx];
      setFromDate(r.from());
      setToDate(r.to());
    }
    setRangeIdx(idx);
  };

  const toggleTxType = (key: string) =>
    setTxTypes(prev => ({ ...prev, [key]: !prev[key] }));

  const enabledTypes = Object.entries(txTypes).filter(([, v]) => v).map(([k]) => k);

  const handleOpenLedger = () => {
    navigation.navigate('Ledger', {
      fromDate,
      toDate,
      partyId: partyId || undefined,
      types: enabledTypes,
    });
  };

  if (isLoading && !dashboardStats) { return <LoadingSpinner message="Generating reports..." />; }

  const filteredParties = allParties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase())
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick Range Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rangeRow} contentContainerStyle={styles.rangeContent}>
        {QUICK_RANGES.map((r, i) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.rangeBtn, rangeIdx === i && styles.rangeBtnActive]}
            onPress={() => applyQuickRange(i)}
          >
            <Text style={[styles.rangeTxt, rangeIdx === i && styles.rangeTxtActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom Date Picker */}
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>From Date</Text>
          <TextInput
            style={styles.dateInput}
            value={fromDate}
            onChangeText={v => { setFromDate(v); setRangeIdx(QUICK_RANGES.length - 1); }}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>To Date</Text>
          <TextInput
            style={styles.dateInput}
            value={toDate}
            onChangeText={v => { setToDate(v); setRangeIdx(QUICK_RANGES.length - 1); }}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <TouchableOpacity style={styles.applyBtn} onPress={loadData}>
          <Text style={styles.applyTxt}>Apply</Text>
        </TouchableOpacity>
      </View>

      {/* Party Filter */}
      <View style={styles.partyRow}>
        <Text style={styles.filterLabel}>Filter by Party</Text>
        <TouchableOpacity style={styles.partyPicker} onPress={() => setShowPartyPkr(true)}>
          <Text style={[styles.partyPickerTxt, !selectedParty && { color: '#9ca3af' }]}>
            {selectedParty ? `${selectedParty.name} (${selectedParty.type})` : 'All Parties'}
          </Text>
          <Text style={styles.partyPickerChev}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction Type Checkboxes */}
      <Text style={styles.filterLabel}>Transaction Types</Text>
      <View style={styles.txRow}>
        {TX_TYPES.map(t => (
          <TouchableOpacity
            key={t.key}
            style={styles.txItem}
            onPress={() => toggleTxType(t.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, txTypes[t.key] && styles.checkboxActive]}>
              {txTypes[t.key] && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.txLabel}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sales Summary */}
      <Text style={styles.sectionTitle}>📈 Sales Summary</Text>
      <View style={styles.statGrid}>
        {[
          { label: 'Total Sales',    value: fmt(salesSummary?.totalRevenue     || dashboardStats?.totalSalesRevenue || 0) },
          { label: 'Total Invoices', value: String(salesSummary?.totalSales    || dashboardStats?.salesCount        || 0) },
          { label: 'Avg Invoice',    value: fmt(salesSummary?.averageSaleValue || 0) },
          { label: 'Tax Collected',  value: fmt(salesSummary?.totalGst         || 0) },
        ].map(stat => (
          <Card key={stat.label} style={styles.statCard} padding={14}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      {/* Purchases Summary */}
      <Text style={styles.sectionTitle}>🛒 Purchase Summary</Text>
      <View style={styles.statGrid}>
        {[
          { label: 'Total Purchases', value: fmt(purchaseSummary?.totalExpenses         || 0) },
          { label: 'Total Invoices',  value: String(purchaseSummary?.totalPurchases      || dashboardStats?.purchasesCount || 0) },
          { label: 'Avg Invoice',     value: fmt(purchaseSummary?.averagePurchaseValue   || 0) },
          { label: 'Tax Paid',        value: fmt(purchaseSummary?.totalGst               || 0) },
        ].map(stat => (
          <Card key={stat.label} style={styles.statCard} padding={14}>
            <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      {/* Dues Summary */}
      <Text style={styles.sectionTitle}>💳 Dues Summary</Text>
      <View style={styles.statGrid}>
        {[
          { label: 'Total Outstanding', value: fmt(duesSummary?.totalBalance  || 0) },
          { label: 'Pending',           value: String(duesSummary?.pendingCount || 0) },
          { label: 'Cleared',           value: String(duesSummary?.clearedCount || 0) },
          { label: 'Partial',           value: String(duesSummary?.partialCount || 0) },
        ].map(stat => (
          <Card key={stat.label} style={styles.statCard} padding={14}>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      {/* Open Ledger Statement */}
      <Card style={styles.pdfCard} padding={20}>
        <Text style={styles.pdfTitle}>📄 Unified Entity Ledger</Text>
        <Text style={styles.pdfSub}>
          Period: {fromDate} → {toDate}
          {selectedParty ? `  •  Party: ${selectedParty.name}` : ''}
          {'\n'}Types: {enabledTypes.join(', ') || 'All'}
        </Text>
        <TouchableOpacity style={styles.pdfBtn} onPress={handleOpenLedger}>
          <Text style={styles.pdfBtnText}>Open Ledger →</Text>
        </TouchableOpacity>
      </Card>

      {/* Party Picker Modal */}
      <Modal visible={showPartyPkr} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="slide" transparent onRequestClose={() => setShowPartyPkr(false)}>
        <TouchableOpacity style={styles.pkrOverlay} activeOpacity={1} onPress={() => setShowPartyPkr(false)}>
          <View style={[styles.pkrSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.pkrTitle}>Select Party</Text>
            <TextInput
              style={styles.pkrSearch}
              placeholder="Search party..."
              value={partySearch}
              onChangeText={setPartySearch}
              placeholderTextColor="#9ca3af"
              autoFocus
            />
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              <TouchableOpacity style={styles.pkrOption} onPress={() => { setPartyId(''); setShowPartyPkr(false); }}>
                <Text style={[styles.pkrOptionTxt, { color: !partyId ? '#f16a0a' : '#1f2937' }]}>
                  — All Parties —
                </Text>
              </TouchableOpacity>
              {filteredParties.map(p => (
                <TouchableOpacity key={p.id} style={styles.pkrOption} onPress={() => { setPartyId(p.id); setShowPartyPkr(false); setPartySearch(''); }}>
                  <Text style={[styles.pkrOptionTxt, p.id === partyId && { color: '#f16a0a', fontWeight: '700' }]}>
                    {p.name} ({p.type})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#f9fafb' },
  content:       { padding: 16, paddingBottom: 32 },

  rangeRow:      { marginBottom: 14 },
  rangeContent:  { gap: 8 },
  rangeBtn:      { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  rangeBtnActive:{ borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  rangeTxt:      { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  rangeTxtActive:{ color: '#f16a0a' },

  dateRow:       { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 14 },
  dateField:     { flex: 1 },
  dateLabel:     { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  dateInput:     { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#1f2937' },
  applyBtn:      { backgroundColor: '#f16a0a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  applyTxt:      { color: '#fff', fontWeight: '700', fontSize: 13 },

  partyRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  filterLabel:   { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  partyPicker:   { flex: 1, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  partyPickerTxt:{ fontSize: 14, color: '#1f2937', flex: 1 },
  partyPickerChev:{ fontSize: 12, color: '#9ca3af' },

  txRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  txItem:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox:      { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkboxActive:{ borderColor: '#f16a0a', backgroundColor: '#f16a0a' },
  checkmark:     { color: '#fff', fontSize: 12, fontWeight: '800' },
  txLabel:       { fontSize: 14, fontWeight: '600', color: '#374151' },

  sectionTitle:  { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  statGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard:      { width: '48%' },
  statValue:     { fontSize: 18, fontWeight: '800', color: '#22c55e', marginBottom: 4 },
  statLabel:     { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

  pdfCard:       { backgroundColor: '#fef7ee', borderColor: '#f16a0a', borderWidth: 1 },
  pdfTitle:      { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  pdfSub:        { fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 20 },
  pdfBtn:        { backgroundColor: '#f16a0a', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  pdfBtnText:    { color: '#ffffff', fontWeight: '700', fontSize: 15 },

  pkrOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pkrSheet:      { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  pkrTitle:      { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 12 },
  pkrSearch:     { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937', marginBottom: 12 },
  pkrOption:     { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pkrOptionTxt:  { fontSize: 15, color: '#1f2937', fontWeight: '500' },
});
