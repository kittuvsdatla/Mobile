/**
 * ReportsScreen — Premium redesign matching DuesScreen style.
 * Features: navy gradient header, quick range filter chips, inline calendar date picker,
 * KPI stats row, Sales/Purchase/Dues summaries, all transactions list, invoice preview.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, TextInput, Modal, StatusBar, FlatList, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { RootState, AppDispatch } from '@/store';
import {
  fetchDashboardStats, fetchSalesSummary, fetchPurchasesSummary, fetchDuesSummary, fetchLedger,
} from '@/store/slices/reportsSlice';
import { fetchCustomers, fetchSuppliers } from '@/store/slices/partiesSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { InvoicePreviewModal } from '@/components/modals/InvoicePreviewModal';
import type { InvoiceDetails } from '@/components/modals/InvoicePreviewModal';
import type { DashboardDrawerParamList } from '@/types';

// ── Design tokens (matches DuesScreen) ────────────────────────────────────────
const T = {
  navy:      '#0f172a',
  navyMid:   '#1e293b',
  bg:        '#f1f5f9',
  surface:   '#ffffff',
  primary:   '#6366f1',
  primaryBg: '#eef2ff',
  rose:      '#f43f5e',
  roseBg:    '#fff1f2',
  emerald:   '#10b981',
  emeraldBg: '#ecfdf5',
  amber:     '#f59e0b',
  amberBg:   '#fffbeb',
  violet:    '#8b5cf6',
  violetBg:  '#f5f3ff',
  t1:        '#0f172a',
  t2:        '#334155',
  t3:        '#64748b',
  t4:        '#94a3b8',
  bdr:       '#e2e8f0',
  bdrL:      '#f1f5f9',
};

function fmt(n: number) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function fmtNum(n: number) {
  return Number(n || 0).toLocaleString('en-IN');
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function daysAgo(d: number) {
  const dt = new Date(); dt.setDate(dt.getDate() - d);
  return dt.toISOString().split('T')[0];
}
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function formatDateLabel(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const QUICK_RANGES = [
  { label: 'Today',       from: todayStr,         to: todayStr },
  { label: 'This Week',   from: () => daysAgo(7), to: todayStr },
  { label: 'This Month',  from: monthStart,        to: todayStr },
  { label: '3 Months',    from: () => daysAgo(90), to: todayStr },
  { label: '6 Months',    from: () => daysAgo(180),to: todayStr },
  { label: 'This Year',   from: () => daysAgo(365),to: todayStr },
  { label: 'All Time',    from: () => '2000-01-01',to: todayStr },
  { label: 'Custom',      from: () => daysAgo(30), to: todayStr },
] as const;

const TX_TYPES = [
  { key: 'SALE',     label: 'Sales',     color: T.emerald, bg: T.emeraldBg },
  { key: 'PURCHASE', label: 'Purchases', color: T.violet,  bg: T.violetBg  },
  { key: 'DUE',      label: 'Dues',      color: T.amber,   bg: T.amberBg   },
  { key: 'PAYMENT',  label: 'Payments',  color: T.primary, bg: T.primaryBg },
];

export default function ReportsScreen() {
  const dispatch   = useDispatch<AppDispatch>();
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<DrawerNavigationProp<DashboardDrawerParamList>>();

  const { dashboardStats, salesSummary, purchaseSummary, duesSummary, isLoading } =
    useSelector((state: RootState) => state.reports);
  const { customers, suppliers } = useSelector((s: RootState) => s.parties);

  const [rangeIdx,   setRangeIdx]   = useState(2); // default: This Month
  const [fromDate,   setFromDate]   = useState(monthStart());
  const [toDate,     setToDate]     = useState(todayStr());
  const [refreshing, setRefreshing] = useState(false);

  // Party filter
  const [partyId,      setPartyId]      = useState('');
  const [partySearch,  setPartySearch]  = useState('');
  const [showPartyPkr, setShowPartyPkr] = useState(false);

  // Transaction types
  const [txTypes, setTxTypes] = useState<Record<string, boolean>>({
    SALE: true, PURCHASE: true, DUE: true, PAYMENT: true,
  });

  // Custom date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calTarget,      setCalTarget]      = useState<'FROM' | 'TO'>('FROM');
  const [calMonth,       setCalMonth]       = useState(new Date());
  const [tempFrom,       setTempFrom]       = useState(fromDate);
  const [tempTo,         setTempTo]         = useState(toDate);

  // Invoice Preview
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);

  const { ledgerEntries } = useSelector((state: RootState) => state.reports);

  const allParties     = [...customers, ...suppliers];
  const selectedParty  = allParties.find(p => p.id === partyId);
  const filteredParties = allParties.filter(p =>
    p.name.toLowerCase().includes(partySearch.toLowerCase())
  );
  const enabledTypes = Object.entries(txTypes).filter(([, v]) => v).map(([k]) => k);
  // Keep a stable ref for use in loadData callback
  const enabledTypesList = Object.entries(txTypes).filter(([, v]) => v).map(([k]) => k);

  // Filter ledger entries by enabled transaction types
  // Backend type strings: "Sale", "Purc", "Due", "Opening Balance", "Rect" (receipt), "Pymt" (payment)
  const filteredLedger = (ledgerEntries || []).filter((e: any) => {
    const t = (e.type || '');
    if (txTypes['SALE']     && (t === 'Sale' || t === 'Rect')) return true;
    if (txTypes['PURCHASE'] && (t === 'Purc' || t === 'Pymt')) return true;
    if (txTypes['DUE']      && (t === 'Due' || t === 'Opening Balance')) return true;
    if (txTypes['PAYMENT']  && (t === 'Rect' || t === 'Pymt')) return true;
    return false;
  });

  const handleTransactionPress = (entry: any) => {
    const t = entry.type || '';
    // Sale and Rect (receipt) are linked to a sale invoice
    const isSale     = t === 'Sale' || t === 'Rect';
    // Purc (purchase) is linked to a purchase invoice
    const isPurchase = t === 'Purc';
    if (!isSale && !isPurchase) return; // Due/Pymt — no invoice to show
    setSelectedInvoice({
      id: entry.referenceId,
      type: isSale ? 'SALE' : 'PURCHASE',
      date: entry.date || '',
      invoiceNumber: entry.voucherNo,
      partyName: entry.partyName || entry.particulars,
    });
  };

  const loadData = useCallback(() => {
    dispatch(fetchDashboardStats({ from: fromDate, to: toDate }));
    dispatch(fetchSalesSummary({ from: fromDate, to: toDate }));
    dispatch(fetchPurchasesSummary({ from: fromDate, to: toDate }));
    dispatch(fetchDuesSummary());
    dispatch(fetchLedger({ from: fromDate, to: toDate, partyId: partyId || undefined, types: enabledTypesList }));
    dispatch(fetchCustomers());
    dispatch(fetchSuppliers());
  }, [fromDate, toDate, partyId, dispatch]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  // Entity registration date — resolve before range handlers
  const entityFromDate = dashboardStats?.entityCreatedAt
    ? (dashboardStats.entityCreatedAt as string).split('T')[0]
    : '2000-01-01';

  // Automatically update the "All Time" start date once dashboardStats loads
  useEffect(() => {
    if (rangeIdx === 6 && dashboardStats?.entityCreatedAt) {
      const realFrom = (dashboardStats.entityCreatedAt as string).split('T')[0];
      if (fromDate !== realFrom) {
        setFromDate(realFrom);
      }
    }
  }, [dashboardStats?.entityCreatedAt, rangeIdx, fromDate]);

  const applyQuickRange = (idx: number) => {
    const r = QUICK_RANGES[idx];
    if (idx < QUICK_RANGES.length - 1) {
      // "All Time" is index 6 — use entity registration date
      const from = (idx === 6) ? entityFromDate : r.from();
      setFromDate(from);
      setToDate(r.to());
    } else {
      // Custom — open date picker
      setTempFrom(fromDate);
      setTempTo(toDate);
      setCalTarget('FROM');
      setCalMonth(new Date(fromDate));
      setShowDatePicker(true);
    }
    setRangeIdx(idx);
  };

  const applyCustomDates = () => {
    setFromDate(tempFrom);
    setToDate(tempTo);
    setShowDatePicker(false);
  };

  const toLocalStr = (d: Date) => {
    if (isNaN(d.getTime())) return '1970-01-01';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dy}`;
  };

  const handleOpenLedger = () => {
    navigation.navigate('Ledger', {
      fromDate,
      toDate,
      partyId: partyId || undefined,
      types: enabledTypes,
    });
  };

  // ── Computed stats ──────────────────────────────────────────────────────────
  const totalSalesRev   = salesSummary?.totalAmount    || dashboardStats?.totalSales    || 0;
  const totalSalesCount = salesSummary?.count          || dashboardStats?.salesCount    || 0;
  const totalPurchRev   = purchaseSummary?.totalAmount || dashboardStats?.totalPurchases|| 0;
  const totalPurchCount = purchaseSummary?.count       || dashboardStats?.purchasesCount|| 0;
  const grossProfit     = dashboardStats?.grossProfit  || (totalSalesRev - totalPurchRev);
  const isProfitable    = Number(grossProfit) >= 0;

  // Entity registration date — also resolved below for completeness (kept for use in stats section)
  const entityFromDate2 = dashboardStats?.entityCreatedAt
    ? (dashboardStats.entityCreatedAt as string).split('T')[0]
    : '2000-01-01';

  const totalDueBalance = duesSummary?.totalBalance || 0;
  const pendingCount    = duesSummary?.pending      || duesSummary?.pendingCount || 0;
  const partialCount    = duesSummary?.partial      || duesSummary?.partialCount || 0;
  const clearedCount    = duesSummary?.cleared      || duesSummary?.clearedCount || 0;

  if (isLoading && !dashboardStats) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
        <LoadingSpinner message="Generating reports..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <View style={[S.headerGrad, { paddingTop: insets.top + 16 }]}>
        <View style={S.headerContent}>
          <View>
            <Text style={S.headerTitle}>Reports & Analytics</Text>
            <Text style={S.headerSub}>
              {formatDateLabel(fromDate)} → {formatDateLabel(toDate)}
            </Text>
          </View>
          {selectedParty && (
            <TouchableOpacity
              style={S.partyBadge}
              onPress={() => { setPartyId(''); }}
            >
              <Text style={S.partyBadgeTxt} numberOfLines={1}>{selectedParty.name} ✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Range Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.filterRow}
        >
          {QUICK_RANGES.map((r, i) => (
            <TouchableOpacity
              key={r.label}
              style={[S.fChip, rangeIdx === i && S.fChipActive]}
              onPress={() => applyQuickRange(i)}
            >
              <Text style={[S.fTxt, rangeIdx === i && S.fTxtActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── KPI STATS ROW (overlapping header) ──────────────────────────────── */}
      <View style={S.statsRow}>
        <View style={S.statCard}>
          <Text style={S.statLbl}>Sales</Text>
          <Text style={[S.statVal, { color: T.emerald }]}>{fmt(totalSalesRev)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: T.bdr }} />
        <View style={S.statCard}>
          <Text style={S.statLbl}>Purchases</Text>
          <Text style={[S.statVal, { color: T.violet }]}>{fmt(totalPurchRev)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: T.bdr }} />
        <View style={S.statCard}>
          <Text style={S.statLbl}>Profit</Text>
          <Text style={[S.statVal, { color: isProfitable ? T.emerald : T.rose }]}>
            {isProfitable ? '' : '-'}{fmt(Math.abs(Number(grossProfit)))}
          </Text>
        </View>
      </View>

      {/* ── SCROLLABLE CONTENT ───────────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      >

        {/* ── FILTER BAR ───────────────────────────────────────────────────── */}
        <View style={S.filterBar}>
          <TouchableOpacity style={S.filterPartyBtn} onPress={() => setShowPartyPkr(true)}>
            <Text style={S.filterPartyIcon}>👤</Text>
            <Text style={[S.filterPartyTxt, !selectedParty && { color: T.t4 }]} numberOfLines={1}>
              {selectedParty ? selectedParty.name : 'Filter by Party'}
            </Text>
            <Text style={{ color: T.t4, fontSize: 12 }}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Type Toggles */}
        <View style={S.txRow}>
          {TX_TYPES.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[S.txChip, txTypes[t.key] && { backgroundColor: t.bg, borderColor: t.color }]}
              onPress={() => setTxTypes(prev => ({ ...prev, [t.key]: !prev[t.key] }))}
            >
              <View style={[S.txDot, { backgroundColor: txTypes[t.key] ? t.color : T.bdr }]} />
              <Text style={[S.txTxt, txTypes[t.key] && { color: t.color }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── SALES SUMMARY ───────────────────────────────────────────────── */}
        <View style={S.sectionCard}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionIcon}>📈</Text>
            <Text style={S.sectionTitle}>Sales Summary</Text>
            <View style={[S.sectionBadge, { backgroundColor: T.emeraldBg }]}>
              <Text style={[S.sectionBadgeTxt, { color: T.emerald }]}>
                {fmtNum(totalSalesCount)} invoices
              </Text>
            </View>
          </View>
          <View style={S.kpiGrid}>
            <View style={[S.kpiCard, { borderLeftColor: T.emerald }]}>
              <Text style={S.kpiLabel}>Total Revenue</Text>
              <Text style={[S.kpiValue, { color: T.emerald }]}>{fmt(totalSalesRev)}</Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: T.emerald }]}>
              <Text style={S.kpiLabel}>Avg Invoice</Text>
              <Text style={[S.kpiValue, { color: T.emerald }]}>
                {fmt(totalSalesCount > 0 ? totalSalesRev / totalSalesCount : 0)}
              </Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: T.amber }]}>
              <Text style={S.kpiLabel}>Amount Due</Text>
              <Text style={[S.kpiValue, { color: T.amber }]}>
                {fmt(salesSummary?.totalDue || 0)}
              </Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: T.primary }]}>
              <Text style={S.kpiLabel}>Invoices</Text>
              <Text style={[S.kpiValue, { color: T.primary }]}>{fmtNum(totalSalesCount)}</Text>
            </View>
          </View>
        </View>

        {/* ── PURCHASE SUMMARY ─────────────────────────────────────────────── */}
        <View style={S.sectionCard}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionIcon}>🛒</Text>
            <Text style={S.sectionTitle}>Purchase Summary</Text>
            <View style={[S.sectionBadge, { backgroundColor: T.violetBg }]}>
              <Text style={[S.sectionBadgeTxt, { color: T.violet }]}>
                {fmtNum(totalPurchCount)} invoices
              </Text>
            </View>
          </View>
          <View style={S.kpiGrid}>
            <View style={[S.kpiCard, { borderLeftColor: T.violet }]}>
              <Text style={S.kpiLabel}>Total Spend</Text>
              <Text style={[S.kpiValue, { color: T.violet }]}>{fmt(totalPurchRev)}</Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: T.violet }]}>
              <Text style={S.kpiLabel}>Avg Invoice</Text>
              <Text style={[S.kpiValue, { color: T.violet }]}>
                {fmt(totalPurchCount > 0 ? totalPurchRev / totalPurchCount : 0)}
              </Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: T.rose }]}>
              <Text style={S.kpiLabel}>Invoices</Text>
              <Text style={[S.kpiValue, { color: T.rose }]}>{fmtNum(totalPurchCount)}</Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: isProfitable ? T.emerald : T.rose }]}>
              <Text style={S.kpiLabel}>Gross Profit</Text>
              <Text style={[S.kpiValue, { color: isProfitable ? T.emerald : T.rose }]}>
                {isProfitable ? '' : '-'}{fmt(Math.abs(Number(grossProfit)))}
              </Text>
            </View>
          </View>
        </View>

        {/* ── DUES OVERVIEW ────────────────────────────────────────────────── */}
        <View style={S.sectionCard}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionIcon}>💳</Text>
            <Text style={S.sectionTitle}>Dues Overview</Text>
            <View style={[S.sectionBadge, { backgroundColor: T.roseBg }]}>
              <Text style={[S.sectionBadgeTxt, { color: T.rose }]}>
                {fmt(totalDueBalance)} outstanding
              </Text>
            </View>
          </View>
          <View style={S.duesRow}>
            <View style={[S.duesStat, { backgroundColor: T.roseBg }]}>
              <Text style={[S.duesStatNum, { color: T.rose }]}>{fmtNum(pendingCount)}</Text>
              <Text style={S.duesStatLbl}>Pending</Text>
            </View>
            <View style={[S.duesStat, { backgroundColor: T.amberBg }]}>
              <Text style={[S.duesStatNum, { color: T.amber }]}>{fmtNum(partialCount)}</Text>
              <Text style={S.duesStatLbl}>Partial</Text>
            </View>
            <View style={[S.duesStat, { backgroundColor: T.emeraldBg }]}>
              <Text style={[S.duesStatNum, { color: T.emerald }]}>{fmtNum(clearedCount)}</Text>
              <Text style={S.duesStatLbl}>Cleared</Text>
            </View>
          </View>
        </View>

        {/* ── BUSINESS OVERVIEW ────────────────────────────────────────────── */}
        <View style={S.sectionCard}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionIcon}>🏢</Text>
            <Text style={S.sectionTitle}>Business Overview</Text>
          </View>
          <View style={S.kpiGrid}>
            <View style={[S.kpiCard, { borderLeftColor: T.primary }]}>
              <Text style={S.kpiLabel}>Customers</Text>
              <Text style={[S.kpiValue, { color: T.primary }]}>
                {fmtNum(dashboardStats?.customerCount || 0)}
              </Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: T.violet }]}>
              <Text style={S.kpiLabel}>Suppliers</Text>
              <Text style={[S.kpiValue, { color: T.violet }]}>
                {fmtNum(dashboardStats?.supplierCount || 0)}
              </Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: T.amber }]}>
              <Text style={S.kpiLabel}>Products</Text>
              <Text style={[S.kpiValue, { color: T.amber }]}>
                {fmtNum(dashboardStats?.productCount || 0)}
              </Text>
            </View>
            <View style={[S.kpiCard, { borderLeftColor: T.rose }]}>
              <Text style={S.kpiLabel}>Low Stock</Text>
              <Text style={[S.kpiValue, { color: T.rose }]}>
                {fmtNum(dashboardStats?.lowStockCount || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── OPEN LEDGER CTA ───────────────────────────────────────────────── */}
        <TouchableOpacity style={S.ledgerCta} onPress={handleOpenLedger} activeOpacity={0.85}>
          <View style={S.ledgerCtaLeft}>
            <Text style={S.ledgerCtaIcon}>📄</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.ledgerCtaTitle}>View Detailed Ledger</Text>
              <Text style={S.ledgerCtaSub}>
                {enabledTypes.join(', ')} • {formatDateLabel(fromDate)} → {formatDateLabel(toDate)}
                {selectedParty ? `\n${selectedParty.name}` : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        {/* ── ALL TRANSACTIONS ──────────────────────────────────────────────── */}
        <View style={S.sectionCard}>
          <View style={S.sectionHeader}>
            <Text style={S.sectionIcon}>🧾</Text>
            <Text style={S.sectionTitle}>All Transactions</Text>
            <View style={[S.sectionBadge, { backgroundColor: T.primaryBg }]}>
              <Text style={[S.sectionBadgeTxt, { color: T.primary }]}>
                {filteredLedger.length} entries
              </Text>
            </View>
          </View>

          {filteredLedger.length === 0 ? (
            <View style={S.emptyTxBox}>
              <Text style={S.emptyTxIcon}>📋</Text>
              <Text style={S.emptyTxTitle}>No transactions found</Text>
              <Text style={S.emptyTxSub}>Adjust your filters or date range.</Text>
            </View>
          ) : (
            filteredLedger.map((entry: any, idx: number) => {
              const t = entry.type || '';
              // Backend type strings: Sale, Purc, Due, Rect (receipt), Pymt (payment)
              const isSale     = t === 'Sale';
              const isReceipt  = t === 'Rect';
              const isPurchase = t === 'Purc';
              const isPayment  = t === 'Pymt';
              const isDue      = t === 'Due';
              const isClickable = isSale || isPurchase || isReceipt;

              let accentColor = T.t3;
              let accentBg    = T.bg;
              let typeIcon    = '📋';
              let typeLabel   = t;
              if (isSale)     { accentColor = T.emerald; accentBg = T.emeraldBg; typeIcon = '📈'; typeLabel = 'Sale';     }
              if (isReceipt)  { accentColor = T.emerald; accentBg = T.emeraldBg; typeIcon = '💰'; typeLabel = 'Receipt';  }
              if (isPurchase) { accentColor = T.violet;  accentBg = T.violetBg;  typeIcon = '🛒'; typeLabel = 'Purchase'; }
              if (isPayment)  { accentColor = T.primary; accentBg = T.primaryBg; typeIcon = '💸'; typeLabel = 'Payment';  }
              if (isDue)      { accentColor = T.amber;   accentBg = T.amberBg;   typeIcon = '💳'; typeLabel = 'Due';      }

              const debit  = Number(entry.debit  || 0);
              const credit = Number(entry.credit || 0);
              const amount = debit > 0 ? debit : credit;
              const isDebit = debit > 0;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[S.txCard, !isClickable && { opacity: 0.85 }]}
                  onPress={() => handleTransactionPress(entry)}
                  activeOpacity={isClickable ? 0.7 : 1}
                >
                  <View style={[S.txAvatar, { backgroundColor: accentBg }]}>
                    <Text style={{ fontSize: 18 }}>{typeIcon}</Text>
                  </View>
                  <View style={S.txInfo}>
                    <Text style={S.txParty} numberOfLines={1}>
                      {entry.partyName || entry.particulars || '—'}
                    </Text>
                    <View style={S.txMeta}>
                      <View style={[S.txTypeBadge, { backgroundColor: accentBg }]}>
                        <Text style={[S.txTypeTxt, { color: accentColor }]}>{typeLabel}</Text>
                      </View>
                      <Text style={S.txVoucher}>{entry.voucherNo || ''}</Text>
                      {entry.date ? <Text style={S.txDate}>{formatDateLabel(String(entry.date))}</Text> : null}
                    </View>
                  </View>
                  <View style={S.txAmtWrap}>
                    <Text style={[S.txAmt, { color: isDebit ? T.rose : T.emerald }]}>
                      {isDebit ? '- ' : '+ '}{fmt(amount)}
                    </Text>
                    {isClickable && (
                      <Text style={[S.txViewTxt, { color: accentColor }]}>View →</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* ── CUSTOM DATE PICKER MODAL ──────────────────────────────────────────── */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}>
                <Text style={{ fontSize: 24, color: T.navy, fontWeight: '800' }}>‹</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '800', color: T.navy }}>
                {calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}>
                <Text style={{ fontSize: 24, color: T.navy, fontWeight: '800' }}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: calTarget === 'FROM' ? T.primary : T.bdr, alignItems: 'center' }}
                onPress={() => setCalTarget('FROM')}
              >
                <Text style={{ fontSize: 11, color: T.t3, fontWeight: '700', marginBottom: 4 }}>FROM</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: T.navy }}>{tempFrom || '--'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: calTarget === 'TO' ? T.primary : T.bdr, alignItems: 'center' }}
                onPress={() => setCalTarget('TO')}
              >
                <Text style={{ fontSize: 11, color: T.t3, fontWeight: '700', marginBottom: 4 }}>TO</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: T.navy }}>{tempTo || '--'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={{ width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '800', color: T.t3, marginBottom: 10 }}>{d}</Text>
              ))}
              {Array(new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay()).fill(0).map((_, i) => (
                <View key={`e-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
              ))}
              {Array.from({ length: new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(d => {
                const dateStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = (calTarget === 'FROM' ? tempFrom : tempTo) === dateStr;
                const inRange = tempFrom && tempTo && dateStr >= tempFrom && dateStr <= tempTo;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      if (calTarget === 'FROM') { setTempFrom(dateStr); setCalTarget('TO'); }
                      else { setTempTo(dateStr); }
                    }}
                    style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <View style={{
                      width: 32, height: 32, borderRadius: 16,
                      backgroundColor: isSelected ? T.primary : (inRange ? T.primaryBg : 'transparent'),
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: isSelected ? '900' : '600', color: isSelected ? '#fff' : T.navy }}>{d}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={{ flex: 1, borderWidth: 1.5, borderColor: T.bdr, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: T.t3, fontSize: 15, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 2, backgroundColor: T.navy, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                onPress={applyCustomDates}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Apply Range</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── PARTY PICKER MODAL ────────────────────────────────────────────────── */}
      <Modal visible={showPartyPkr} transparent animationType="slide" onRequestClose={() => setShowPartyPkr(false)}>
        <TouchableOpacity style={S.pkrOverlay} activeOpacity={1} onPress={() => setShowPartyPkr(false)}>
          <View style={[S.pkrSheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <Text style={S.pkrTitle}>Filter by Party</Text>
            <TextInput
              style={S.pkrSearch}
              placeholder="Search party..."
              value={partySearch}
              onChangeText={setPartySearch}
              placeholderTextColor={T.t4}
              autoFocus
            />
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              <TouchableOpacity style={S.pkrOption} onPress={() => { setPartyId(''); setShowPartyPkr(false); }}>
                <Text style={[S.pkrOptionTxt, { color: !partyId ? T.primary : T.t1, fontWeight: !partyId ? '800' : '500' }]}>
                  — All Parties —
                </Text>
              </TouchableOpacity>
              {filteredParties.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={S.pkrOption}
                  onPress={() => { setPartyId(p.id); setShowPartyPkr(false); setPartySearch(''); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[S.pkrTypeBadge, { backgroundColor: p.type === 'CUSTOMER' ? T.emeraldBg : T.violetBg }]}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: p.type === 'CUSTOMER' ? T.emerald : T.violet }}>
                        {p.type === 'CUSTOMER' ? 'CUST' : 'SUPP'}
                      </Text>
                    </View>
                    <Text style={[S.pkrOptionTxt, p.id === partyId && { color: T.primary, fontWeight: '800' }]}>
                      {p.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── INVOICE PREVIEW MODAL ─────────────────────────────────────────────── */}
      <InvoicePreviewModal
        visible={!!selectedInvoice}
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

    </View>
  );
}

const S = StyleSheet.create({
  // Header
  headerGrad:     { paddingHorizontal: 20, paddingBottom: 68, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: T.navy },
  headerContent:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle:    { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  headerSub:      { fontSize: 13, color: '#94a3b8', marginTop: 4 },

  partyBadge:     { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 120 },
  partyBadgeTxt:  { color: '#fff', fontSize: 12, fontWeight: '700' },

  filterRow:      { gap: 8, paddingBottom: 4 },
  fChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fChipActive:    { backgroundColor: '#fff', borderColor: '#fff' },
  fTxt:           { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  fTxtActive:     { color: T.navy, fontWeight: '800' },

  // Stats row
  statsRow:       { flexDirection: 'row', backgroundColor: T.surface, marginHorizontal: 20, borderRadius: 16, paddingVertical: 16, marginTop: -30, elevation: 4, shadowColor: T.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  statCard:       { flex: 1, alignItems: 'center' },
  statLbl:        { fontSize: 11, fontWeight: '700', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal:        { fontSize: 16, fontWeight: '800', color: T.t1 },

  // Scroll
  scrollContent:  { padding: 20, paddingTop: 16, paddingBottom: 100 },

  // Filter bar
  filterBar:      { marginBottom: 12 },
  filterPartyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: T.bdr },
  filterPartyIcon:{ fontSize: 14 },
  filterPartyTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: T.t1 },

  // TX type toggles
  txRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  txChip:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: T.bdr, backgroundColor: T.surface },
  txDot:          { width: 8, height: 8, borderRadius: 4 },
  txTxt:          { fontSize: 13, fontWeight: '600', color: T.t3 },

  // Section cards
  sectionCard:    { backgroundColor: T.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: T.bdr, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionIcon:    { fontSize: 20 },
  sectionTitle:   { fontSize: 16, fontWeight: '800', color: T.t1, flex: 1 },
  sectionBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sectionBadgeTxt:{ fontSize: 11, fontWeight: '700' },

  // KPI grid
  kpiGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard:        { flex: 1, minWidth: '45%', backgroundColor: T.bg, borderRadius: 12, padding: 12, borderLeftWidth: 3 },
  kpiLabel:       { fontSize: 11, fontWeight: '600', color: T.t3, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue:       { fontSize: 16, fontWeight: '800', color: T.t1 },

  // Dues overview
  duesRow:        { flexDirection: 'row', gap: 10 },
  duesStat:       { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  duesStatNum:    { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  duesStatLbl:    { fontSize: 11, fontWeight: '700', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Ledger CTA
  ledgerCta:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.navy, borderRadius: 16, padding: 18 },
  ledgerCtaLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  ledgerCtaIcon:  { fontSize: 28 },
  ledgerCtaTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  ledgerCtaSub:   { fontSize: 12, color: '#94a3b8', lineHeight: 16 },
  ledgerCtaArrow: { fontSize: 22, color: '#fff', fontWeight: '800' },

  // Party picker modal
  pkrOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pkrSheet:       { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '75%' },
  pkrTitle:       { fontSize: 18, fontWeight: '800', color: T.t1, marginBottom: 14 },
  pkrSearch:      { backgroundColor: T.bg, borderWidth: 1.5, borderColor: T.bdr, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: T.t1, marginBottom: 12 },
  pkrOption:      { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.bdrL },
  pkrOptionTxt:   { fontSize: 15, color: T.t1, fontWeight: '500' },
  pkrTypeBadge:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },

  // Transaction cards
  txCard:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.bdrL },
  txAvatar:       { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo:         { flex: 1 },
  txParty:        { fontSize: 14, fontWeight: '700', color: T.t1, marginBottom: 4 },
  txMeta:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  txTypeBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  txTypeTxt:      { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  txVoucher:      { fontSize: 11, color: T.t3, fontWeight: '600' },
  txDate:         { fontSize: 11, color: T.t4, fontWeight: '500' },
  txAmtWrap:      { alignItems: 'flex-end' },
  txAmt:          { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  txViewTxt:      { fontSize: 11, fontWeight: '700' },

  // Empty state
  emptyTxBox:     { alignItems: 'center', paddingVertical: 32 },
  emptyTxIcon:    { fontSize: 40, marginBottom: 10, opacity: 0.6 },
  emptyTxTitle:   { fontSize: 16, fontWeight: '700', color: T.t2, marginBottom: 6 },
  emptyTxSub:     { fontSize: 13, color: T.t3, textAlign: 'center' },
});
