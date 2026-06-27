import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Animated, StatusBar, TextInput, ScrollView, Modal, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchDues, recordPayment } from '@/store/slices/duesSlice';
import { fetchCustomers, fetchSuppliers } from '@/store/slices/partiesSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Due } from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy: '#0f172a',
  navyMid: '#1e293b',
  bg: '#f1f5f9',
  surface: '#ffffff',
  primary: '#f59e0b',  // Amber for dues
  primaryBg: '#fffbeb',
  rose: '#f43f5e',
  roseBg: '#fff1f2',
  emerald: '#10b981',
  emeraldBg: '#ecfdf5',
  amber: '#f59e0b',
  amberBg: '#fffbeb',
  t1: '#0f172a',
  t2: '#334155',
  t3: '#64748b',
  t4: '#94a3b8',
  bdr: '#e2e8f0',
  bdrL: '#f1f5f9',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmt(n: number) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

const PAYMENT_MODES = ['Cash', 'UPI', 'Cheque', 'Bank Transfer'];

export default function DuesScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((s: RootState) => s.dues);

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PARTIAL' | 'CLEARED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEIVABLE' | 'PAYABLE'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');

  // Custom Date
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calTarget, setCalTarget] = useState<'FROM' | 'TO'>('FROM');
  const [calMonth, setCalMonth] = useState(new Date());

  // Payment Modal
  const [payDue, setPayDue] = useState<Due | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  const toLocalStr = (d: Date) => {
    if (isNaN(d.getTime())) return '1970-01-01';
    const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dy = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dy}`;
  };

  const loadData = () => { dispatch(fetchDues(undefined)); };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const filtered = items.filter(d => {
    // 1. Search
    const pName = d.partyName || d.party?.name || '';
    const matchesSearch = pName.toLowerCase().includes(search.toLowerCase()) ||
      (d.dueNumber || d.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Status
    if (statusFilter !== 'ALL' && d.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;

    // 3. Type
    // sale = receivable, purchase = payable
    // opening_balance: if party is CUSTOMER → receivable, SUPPLIER → payable
    const refType = d.referenceType?.toLowerCase();
    const partyType = (d.party?.type || '').toUpperCase();
    const isReceivable = refType === 'sale' || d.type?.toLowerCase() === 'sale'
      || (refType === 'opening_balance' && partyType === 'CUSTOMER')
      || (refType === 'manual' && partyType === 'CUSTOMER');
    if (typeFilter === 'RECEIVABLE' && !isReceivable) return false;
    if (typeFilter === 'PAYABLE' && isReceivable) return false;

    // 4. Date
    if (dateFilter !== 'ALL') {
      const date = new Date(d.createdAt || d.date || new Date());
      const now = new Date();
      if (!isNaN(date.getTime())) {
        if (dateFilter === 'TODAY') {
          if (date.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'WEEK') {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (date < weekAgo) return false;
        } else if (dateFilter === 'MONTH') {
          if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'CUSTOM') {
          const dStr = toLocalStr(date);
          if (filterFrom && dStr < filterFrom) return false;
          if (filterTo && dStr > filterTo) return false;
        }
      }
    }

    return true;
  });

  // Calculate totals from ALL items (not just filtered) so the stats update dynamically
  const isReceivableDue = (d: any) => {
    const refType = d.referenceType?.toLowerCase();
    const partyType = (d.party?.type || '').toUpperCase();
    return refType === 'sale' || d.type?.toLowerCase() === 'sale'
      || (refType === 'opening_balance' && partyType === 'CUSTOMER')
      || (refType === 'manual' && partyType === 'CUSTOMER');
  };
  const totalReceivable = filtered.filter(d => isReceivableDue(d) && d.status !== 'cleared').reduce((s, i) => s + (i.balanceAmount || i.balance || 0), 0);
  const totalPayable = filtered.filter(d => !isReceivableDue(d) && d.status !== 'cleared').reduce((s, i) => s + (i.balanceAmount || i.balance || 0), 0);
  const netBalance = totalReceivable - totalPayable;

  const onRefresh = async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const openPayModal = (due: Due) => {
    setPayDue(due);
    setPayAmount('');
    setPayMode('Cash');
    setPayNotes('');
  };

  const handleRecordPayment = async () => {
    if (!payDue || !payAmount || Number(payAmount) <= 0) { return; }
    const amt = Number(payAmount);
    if (amt > (payDue.balanceAmount || payDue.balance || 0)) {
      Alert.alert('Error', `Cannot exceed balance of ${fmt(payDue.balanceAmount || payDue.balance || 0)}`);
      return;
    }
    setPaying(true);
    try {
      await dispatch(recordPayment({
        id: payDue.id,
        amount: amt,
        paymentMode: payMode,
        notes: payNotes || undefined,
      })).unwrap();
      const pName = payDue.partyName || payDue.party?.name || 'Unknown Party';
      Alert.alert('✓ Success', `Payment recorded for ${pName}`);
      setPayDue(null);
      loadData();
    } catch {
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  if (isLoading && !items.length) return (
    <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
      <LoadingSpinner message="Loading dues..." />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      {/* ── PREMIUM HEADER ─────────────────────────────────────────────────── */}
      <View style={[S.headerGrad, { paddingTop: insets.top + 16, backgroundColor: T.navy }]}>
        <View style={S.headerContent}>
          <View>
            <Text style={S.headerTitle}>Dues & Ledger</Text>
            <Text style={S.headerSub}>Manage your receivables and payables</Text>
          </View>
        </View>

        {/* Floating Search */}
        <View style={S.searchBox}>
          <Text style={S.searchIcon}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search by party or invoice..."
            placeholderTextColor="#cbd5e1"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={S.searchClear}>
              <Text style={S.clearTxt}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
          {['ALL', 'PENDING', 'PARTIAL', 'CLEARED'].map(st => (
            <TouchableOpacity key={st} onPress={() => setStatusFilter(st as any)} style={[S.fChip, statusFilter === st && S.fChipActive]}>
              <Text style={[S.fTxt, statusFilter === st && S.fTxtActive]}>{st === 'ALL' ? 'All Status' : st}</Text>
            </TouchableOpacity>
          ))}
          <View style={S.fDiv} />
          {['ALL', 'RECEIVABLE', 'PAYABLE'].map(st => (
            <TouchableOpacity key={st} onPress={() => setTypeFilter(st as any)} style={[S.fChip, typeFilter === st && S.fChipActive]}>
              <Text style={[S.fTxt, typeFilter === st && S.fTxtActive]}>{st === 'ALL' ? 'All Types' : st === 'RECEIVABLE' ? 'To Receive' : 'To Pay'}</Text>
            </TouchableOpacity>
          ))}
          <View style={S.fDiv} />
          {['ALL', 'TODAY', 'WEEK', 'MONTH', 'CUSTOM'].map(dt => (
            <TouchableOpacity key={dt} onPress={() => { setDateFilter(dt as any); if (dt === 'CUSTOM') setShowDatePicker(true); }} style={[S.fChip, dateFilter === dt && S.fChipActive]}>
              <Text style={[S.fTxt, dateFilter === dt && S.fTxtActive]}>{dt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── STATS ROW (overlapping header) ─────────────────────────────────── */}
      <View style={S.statsRow}>
        <View style={S.statCard}>
          <Text style={S.statLbl}>To Receive</Text>
          <Text style={[S.statVal, { color: T.emerald }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(totalReceivable)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: T.bdr }} />
        <View style={S.statCard}>
          <Text style={S.statLbl}>To Pay</Text>
          <Text style={[S.statVal, { color: T.rose }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(totalPayable)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: T.bdr }} />
        <View style={S.statCard}>
          <Text style={S.statLbl}>Net Balance</Text>
          <Text style={[S.statVal, { color: netBalance > 0 ? T.emerald : netBalance < 0 ? T.rose : T.t1 }]} numberOfLines={1} adjustsFontSizeToFit>{fmt(Math.abs(netBalance))}</Text>
        </View>
      </View>

      {/* ── LIST ───────────────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={S.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ListEmptyComponent={
          <View style={S.emptyBox}>
            <Text style={S.emptyIcon}>💳</Text>
            <Text style={S.emptyTitle}>No dues found</Text>
            <Text style={S.emptySub}>Adjust your filters to see more results.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const refType = (item.referenceType || '').toLowerCase();
          const partyType = (item.party?.type || '').toUpperCase();
          const isReceivable = refType === 'sale' || item.type?.toLowerCase() === 'sale'
            || (refType === 'opening_balance' && partyType === 'CUSTOMER')
            || (refType === 'manual' && partyType === 'CUSTOMER');
          const isCleared = item.status === 'cleared';
          const isPartial = item.status === 'partial';
          const badgeBg = isCleared ? T.emeraldBg : isPartial ? T.amberBg : T.roseBg;
          const badgeTxt = isCleared ? T.emerald : isPartial ? T.amber : T.rose;

          return (
            <View style={S.card}>
              <View style={S.cardTop}>
                <View style={[S.avatar, { backgroundColor: isReceivable ? T.emeraldBg : T.roseBg }]}>
                  <Text style={[S.avatarTxt, { color: isReceivable ? T.emerald : T.rose }]}>{isReceivable ? '↓' : '↑'}</Text>
                </View>
                <View style={S.infoWrap}>
                  <Text style={S.name}>{item.partyName || item.party?.name || 'Unknown Party'}</Text>
                  <View style={S.metaRow}>
                    <Text style={S.botTxt}>{item.dueNumber || item.invoiceNumber || 'Direct Entry'}</Text>
                    <Text style={S.botTxt}>•</Text>
                    <Text style={S.botTxt}>{(item.createdAt || item.date) ? formatDate(item.createdAt || item.date || '') : 'No Date'}</Text>
                  </View>
                </View>
                <View style={S.qtyWrap}>
                  <Text style={S.qty}>{fmt(item.balanceAmount || item.balance || 0)}</Text>
                  <View style={[S.badge, { backgroundColor: badgeBg }]}>
                    <Text style={[S.badgeTxt, { color: badgeTxt }]}>{(item.status || 'pending').toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={S.cardDivider} />

              <View style={S.cardBot}>
                <View style={{ flex: 1, paddingRight: 8, gap: 2 }}>
                  <Text style={S.botTxt} numberOfLines={1} adjustsFontSizeToFit>Total: {fmt(item.totalAmount || item.amount || 0)}</Text>
                  <Text style={[S.botTxt, { color: T.emerald }]} numberOfLines={1} adjustsFontSizeToFit>Paid: {fmt(item.paidAmount || 0)}</Text>
                </View>
                {!isCleared && (
                  <TouchableOpacity style={[S.actionBtn, { backgroundColor: isReceivable ? T.emeraldBg : T.roseBg, flexShrink: 0 }]} onPress={() => openPayModal(item)}>
                    <Text style={[S.actionTxt, { color: isReceivable ? T.emerald : T.rose }]}>{isReceivable ? 'Receive Payment' : 'Record Payment'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* ── CUSTOM DATE PICKER MODAL ───────────────────────────────────────── */}
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
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: calTarget === 'FROM' ? T.primary : T.bdr, alignItems: 'center' }} onPress={() => setCalTarget('FROM')}>
                <Text style={{ fontSize: 11, color: T.t3, fontWeight: '700', marginBottom: 4 }}>FROM</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: T.navy }}>{filterFrom || '--'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: calTarget === 'TO' ? T.primary : T.bdr, alignItems: 'center' }} onPress={() => setCalTarget('TO')}>
                <Text style={{ fontSize: 11, color: T.t3, fontWeight: '700', marginBottom: 4 }}>TO</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: T.navy }}>{filterTo || '--'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <Text key={d} style={{ width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '800', color: T.t3, marginBottom: 10 }}>{d}</Text>
              ))}
              {Array(new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay()).fill(0).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
              ))}
              {Array.from({ length: new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(d => {
                const dateStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = (calTarget === 'FROM' ? filterFrom : filterTo) === dateStr;
                return (
                  <TouchableOpacity key={d} onPress={() => { if (calTarget === 'FROM') { setFilterFrom(dateStr); setCalTarget('TO'); } else { setFilterTo(dateStr); setShowDatePicker(false); } }} style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isSelected ? T.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: isSelected ? '900' : '600', color: isSelected ? '#fff' : T.navy }}>{d}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={{ backgroundColor: T.navy, marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => setShowDatePicker(false)}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PAYMENT MODAL ──────────────────────────────────────────────────── */}
      <Modal visible={!!payDue} animationType="slide" transparent onRequestClose={() => setPayDue(null)}>
        <TouchableOpacity style={S.payOverlay} activeOpacity={1} onPress={() => setPayDue(null)}>
          <View style={S.paySheet} onStartShouldSetResponder={() => true}>
            <Text style={S.payTitle}>
              {(() => {
                const rt = (payDue?.referenceType || '').toLowerCase();
                const pt = (payDue?.party?.type || '').toUpperCase();
                const isRec = rt === 'sale' || payDue?.type?.toLowerCase() === 'sale'
                  || (rt === 'opening_balance' && pt === 'CUSTOMER')
                  || (rt === 'manual' && pt === 'CUSTOMER');
                return isRec ? '💰 Receive Payment' : '💸 Record Payment';
              })()}
            </Text>
            <Text style={S.payParty}>{payDue?.partyName || payDue?.party?.name || 'Unknown Party'}</Text>
            <Text style={S.payBalance}>Outstanding: {fmt(payDue?.balanceAmount || payDue?.balance || 0)}</Text>

            <Text style={S.payLabel}>Amount (₹) *</Text>
            <TextInput
              style={S.payInput}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
            />

            <Text style={S.payLabel}>Payment Mode</Text>
            <View style={S.modeGrid}>
              {PAYMENT_MODES.map(m => (
                <TouchableOpacity key={m} style={[S.modeChip, payMode === m && S.modeChipActive]} onPress={() => setPayMode(m)}>
                  <Text style={[S.modeChipTxt, payMode === m && S.modeChipTxtActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={S.payLabel}>Notes (optional)</Text>
            <TextInput
              style={S.payInput}
              value={payNotes}
              onChangeText={setPayNotes}
              placeholder="Optional notes..."
              multiline
            />

            <View style={S.payActions}>
              <TouchableOpacity style={S.cancelBtn} onPress={() => setPayDue(null)}>
                <Text style={S.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.confirmBtn} onPress={handleRecordPayment} disabled={paying}>
                {paying ? <ActivityIndicator color="#fff" /> : <Text style={S.confirmTxt}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const S = StyleSheet.create({
  headerGrad: { paddingHorizontal: 20, paddingBottom: 68, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: T.surface, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: '#cbd5e1', marginTop: 4 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  searchIcon: { fontSize: 16, marginRight: 8, opacity: 0.8 },
  searchInput: { flex: 1, color: T.surface, fontSize: 15, fontWeight: '500' },
  searchClear: { padding: 6 },
  clearTxt: { color: T.surface, fontSize: 16, opacity: 0.8 },

  filterRow: { gap: 8, marginTop: 16, paddingBottom: 4 },
  fChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fChipActive: { backgroundColor: T.surface, borderColor: T.surface },
  fTxt: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  fTxtActive: { color: T.navy, fontWeight: '800' },
  fDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 6, marginHorizontal: 4 },

  statsRow: { flexDirection: 'row', backgroundColor: T.surface, marginHorizontal: 20, borderRadius: 16, paddingVertical: 16, marginTop: -30, elevation: 4, shadowColor: T.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  statCard: { flex: 1, alignItems: 'center' },
  statLbl: { fontSize: 11, fontWeight: '700', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal: { fontSize: 18, fontWeight: '800', color: T.t1 },

  list: { padding: 20, paddingTop: 16, paddingBottom: 100 },

  emptyBox: { padding: 40, alignItems: 'center', marginTop: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: T.t2, marginBottom: 8 },
  emptySub: { fontSize: 14, color: T.t3, textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: T.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.bdr, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 20, fontWeight: '800' },
  infoWrap: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: T.t1, marginBottom: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qtyWrap: { alignItems: 'flex-end' },
  qty: { fontSize: 16, fontWeight: '800', color: T.t1, marginBottom: 4 },

  cardDivider: { height: 1, backgroundColor: T.bdrL, marginVertical: 12 },
  cardBot: { flexDirection: 'row', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  botTxt: { fontSize: 12, color: T.t3, fontWeight: '600' },

  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionTxt: { fontSize: 12, fontWeight: '800' },

  payOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  paySheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  payTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 4 },
  payParty: { fontSize: 15, fontWeight: '700', color: '#f16a0a', marginBottom: 2 },
  payBalance: { fontSize: 13, color: '#ef4444', fontWeight: '600', marginBottom: 16 },
  payLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  payInput: { backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  modeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  modeChipActive: { borderColor: T.primary, backgroundColor: T.primaryBg },
  modeChipTxt: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeChipTxtActive: { color: T.primary },
  payActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  confirmBtn: { flex: 2, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
