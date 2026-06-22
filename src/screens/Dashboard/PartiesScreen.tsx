/**
 * PartiesScreen — Premium, full-bleed notch-covering design
 * Deep navy header bleeding into status bar, rich typography,
 * vibrant color system, professional card design
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Alert, Modal, ScrollView,
  ActivityIndicator, Animated, SafeAreaView, Platform, StatusBar,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  fetchCustomers, fetchSuppliers,
  addParty, editParty, removeParty,
} from '@/store/slices/partiesSlice';
import { fetchDues } from '@/store/slices/duesSlice';
import { apiService } from '@/services/apiService';
import { downloadLedgerPdf } from '@/services/downloadHelper';
import LinearGradient from 'react-native-linear-gradient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal as UiModal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { Party } from '@/types';
import { InvoicePreviewModal } from '@/components/modals/InvoicePreviewModal';

const { width } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  // Backgrounds
  navy: '#0f172a',
  navyMid: '#1e293b',
  bg: '#f1f5f9',
  surface: '#ffffff',
  // Primary — Emerald (customers)
  emerald: '#10b981',
  emeraldDk: '#059669',
  emeraldBg: '#ecfdf5',
  // Accent — Indigo (suppliers)
  indigo: '#6366f1',
  indigoDk: '#4f46e5',
  indigoBg: '#eef2ff',
  // Status
  rose: '#f43f5e',
  roseBg: '#fff1f2',
  amber: '#f59e0b',
  // Text
  t1: '#0f172a',
  t2: '#334155',
  t3: '#64748b',
  t4: '#94a3b8',
  // Borders
  bdr: '#e2e8f0',
  bdrL: '#f1f5f9',
};

function fmtINR(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
function fmtDate(s: string) {
  if (!s) return '';
  const p = s.split('T')[0].split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s;
}

const MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque'];

// ── Avatar colours per letter ─────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#10b981', '#06b6d4', '#3b82f6',
];
function avatarColor(name: string) {
  const code = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code];
}

export default function PartiesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { customers, suppliers, isLoading } = useSelector((s: RootState) => s.parties);
  const { items: dues } = useSelector((s: RootState) => s.dues);

  const [tab, setTab] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Party | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', state: '', gstNumber: '', openingBalance: '' });
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  // Ledger
  const [ledgerParty, setLedgerParty] = useState<Party | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerMenu, setLedgerMenu] = useState(false);
  const [ledgerShowNotes, setLedgerShowNotes] = useState(false);
  // Date filter for ledger
  const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'FY' | 'CUSTOM'>('ALL');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterMenu, setFilterMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calTarget, setCalTarget] = useState<'FROM' | 'TO'>('FROM');

  // Calendar logic
  const [calMonth, setCalMonth] = useState(new Date());

  // Pay
  const [payParty, setPayParty] = useState<Party | null>(null);
  const [payAmt, setPayAmt] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // Opening Balance state
  const [obParty, setObParty] = useState<Party | null>(null);
  const [obAmount, setObAmount] = useState('');
  const [obNotes, setObNotes] = useState('');
  const [obSaving, setObSaving] = useState(false);

  // Build a map: partyId -> existing opening_balance due (if any)
  const obDueMap = React.useMemo(() => {
    const map: Record<string, { id: string; totalAmount: number }> = {};
    dues.forEach(d => {
      const refType = (d.referenceType || '').toLowerCase();
      if (refType === 'opening_balance') {
        const pId = d.party?.id || (d as any).partyId;
        if (pId && !map[pId]) {
          // Use Number() to safely parse BigDecimal from backend
          const total = Number(d.totalAmount ?? d.amount ?? d.balanceAmount ?? 0);
          map[pId] = { id: d.id, totalAmount: total };
        }
      }
    });
    return map;
  }, [dues]);

  // When dues reload, if Edit modal is open, refresh the OB field too
  React.useEffect(() => {
    if (showModal && editTarget) {
      const existingOB = obDueMap[editTarget.id];
      setForm(prev => ({
        ...prev,
        openingBalance: existingOB ? String(existingOB.totalAmount) : prev.openingBalance,
      }));
    }
  }, [obDueMap]);

  const handleSaveOB = async (partyId: string, partyName: string, amount: string, notes: string) => {
    if (!amount || Number(amount) <= 0) return;
    try {
      const existing = obDueMap[partyId];
      let res;
      if (existing) {
        // UPDATE existing OB due
        res = await apiService.updateDue(existing.id, {
          totalAmount: Number(amount),
          notes: notes || `Opening balance for ${partyName}`,
        });
      } else {
        // CREATE new OB due
        res = await apiService.createManualDue({
          partyId,
          totalAmount: Number(amount),
          amountPaid: 0,
          referenceType: 'opening_balance',
          notes: notes || `Opening balance for ${partyName}`,
        });
      }
      if (res.success) {
        dispatch(fetchDues(undefined));
      } else {
        showToast(`Could not save opening balance: ${res.error || 'Unknown error'}`, 'error');
      }
    } catch {
      showToast('Failed to save opening balance', 'error');
    }
  };

  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0.88)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.88, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, []);

  useEffect(() => {
    Animated.spring(tabAnim, { toValue: tab === 'CUSTOMER' ? 0 : 1, useNativeDriver: false, tension: 80, friction: 12 }).start();
  }, [tab]);

  const loadData = () => {
    dispatch(fetchCustomers()); dispatch(fetchSuppliers()); dispatch(fetchDues(undefined));
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const isCustomer = tab === 'CUSTOMER';
  const PRIMARY = isCustomer ? T.emerald : T.indigo;
  const PRIMARY_DK = isCustomer ? T.emeraldDk : T.indigoDk;
  const PRIMARY_BG = isCustomer ? T.emeraldBg : T.indigoBg;

  const items = isCustomer ? customers : suppliers;
  const filtered = items.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone?.includes(search) ?? false)
  );

  const onRefresh = async () => { setRefreshing(true); loadData(); setRefreshing(false); };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', address: '', state: '', gstNumber: '', openingBalance: '' });
    setShowModal(true);
  };
  const openEdit = (p: Party) => {
    setEditTarget(p);
    // Pre-fill opening balance from existing OB due for this party
    const existingOB = obDueMap[p.id];
    setForm({
      name: p.name,
      phone: p.phone || '',
      address: p.address || '',
      state: p.state || '',
      gstNumber: p.gstNumber || '',
      openingBalance: existingOB ? String(existingOB.totalAmount) : '',
    });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        await dispatch(editParty({ id: editTarget.id, data: form }));
        // Add opening balance if provided during edit
        if (form.openingBalance && Number(form.openingBalance) > 0) {
          await handleSaveOB(editTarget.id, form.name, form.openingBalance, '');
          showToast(`✓ ${form.name} updated · Opening balance saved`);
        } else {
          showToast(`✓  ${form.name} updated successfully`);
        }
        setShowModal(false);
      } else {
        const result = await dispatch(addParty({ ...form, type: tab })) as any;
        // After creating party, save opening balance if provided
        const newPartyId = result?.payload?.id;
        if (newPartyId && form.openingBalance && Number(form.openingBalance) > 0) {
          await handleSaveOB(newPartyId, form.name, form.openingBalance, '');
          showToast(`✓ ${form.name} added · Opening balance of ${fmtINR(Number(form.openingBalance))} set`);
        } else {
          showToast(`✓  ${form.name} added as ${isCustomer ? 'Customer' : 'Supplier'}`);
        }
        setShowModal(false);
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = (id: string) => Alert.alert('Delete Party', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeParty(id)) },
  ]);

  const openLedger = async (p: Party) => {
    setLedgerParty(p); setLedgerLoading(true); setLedgerPage(1);
    setLedgerMenu(false); setLedgerFilter('ALL'); setFilterFrom(''); setFilterTo('');
    try {
      const res = await apiService.getPartyLedger(p.id);
      setLedgerEntries(Array.isArray(res.data) ? res.data : []);
    } catch { setLedgerEntries([]); } finally { setLedgerLoading(false); }
  };

  const openPay = (p: Party) => {
    setPayParty(p); setPayAmt(''); setPayMode('Cash'); setPayNotes('');
    setPayDate(new Date().toISOString().split('T')[0]);
  };
  const handlePay = async () => {
    if (!payParty || !payAmt || Number(payAmt) <= 0) return;
    setPaying(true);
    try {
      await apiService.recordPartyPayment({
        partyId: payParty.id, amount: Number(payAmt),
        paymentMode: payMode.toLowerCase(), notes: payNotes || undefined, date: payDate,
      });
      Alert.alert('✓ Recorded', `Payment of ₹${Number(payAmt).toLocaleString()} recorded`);
      setPayParty(null); dispatch(fetchDues(undefined));
    } catch { Alert.alert('Error', 'Failed to record payment'); } finally { setPaying(false); }
  };

  const duesMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    dues.forEach(d => {
      if (d.status !== 'cleared') {
        const pId = d.party?.id || d.partyId;
        if (pId) {
          map[pId] = (map[pId] || 0) + (d.balanceAmount ?? d.balance ?? 0);
        }
      }
    });
    return map;
  }, [dues]);

  const getDue = (id: string) => duesMap[id] || 0;

  // Ledger processing with date filter
  const processedLedger = (() => {
    const safeDate = (dateStr: any) => {
      if (!dateStr) return new Date(0);
      const d = new Date(typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr);
      return isNaN(d.getTime()) ? new Date(0) : d;
    };

    const sorted = [...ledgerEntries].sort((a, b) => safeDate(a.date).getTime() - safeDate(b.date).getTime());
    let running = 0;
    const mapped = sorted.map(tx => {
      let given = 0, credit = 0;
      const tType = (tx.type || '').toUpperCase();
      if (tType === 'SALE' || tType === 'PURCHASE') {
        given = Number(tx.amountPaid) || 0; credit = Number(tx.dueAmount) || 0; running += credit;
      } else if (tType === 'PAYMENT_RECEIVED' || tType === 'PAYMENT_GIVEN' || tType === 'RECT' || tType === 'PYMT') {
        // Backend returns Rect/Pymt for payments
        given = Number(tx.amount) || 0; running -= given;
      }
      return { ...tx, given, credit, runningBalance: running, _type: tType };
    });
    const all = [...mapped].reverse();

    // Apply date filter
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const toLocalStr = (d: Date) => {
      if (isNaN(d.getTime())) return '1970-01-01';
      const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const dy = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dy}`;
    };

    if (ledgerFilter === 'ALL') return all;
    if (ledgerFilter === 'TODAY') {
      const t = toLocalStr(now);
      return all.filter(e => toLocalStr(safeDate(e.date)) === t);
    }
    if (ledgerFilter === 'YESTERDAY') {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const yd = toLocalStr(y);
      return all.filter(e => toLocalStr(safeDate(e.date)) === yd);
    }
    if (ledgerFilter === 'WEEK') {
      const w = new Date(now); w.setDate(w.getDate() - 6);
      return all.filter(e => safeDate(e.date) >= startOfDay(w));
    }
    if (ledgerFilter === 'MONTH') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      return all.filter(e => safeDate(e.date) >= m);
    }
    if (ledgerFilter === 'FY') {
      const fyStart = now.getMonth() >= 3
        ? new Date(now.getFullYear(), 3, 1)
        : new Date(now.getFullYear() - 1, 3, 1);
      return all.filter(e => safeDate(e.date) >= fyStart);
    }
    if (ledgerFilter === 'CUSTOM' && filterFrom && filterTo) {
      return all.filter(e => {
        const d = toLocalStr(safeDate(e.date));
        return d >= filterFrom && d <= filterTo;
      });
    }
    return all;
  })();

  const totalGiven = processedLedger.reduce((s, e) => s + e.given, 0);
  const totalCredit = processedLedger.reduce((s, e) => s + e.credit, 0);
  const netBalance = processedLedger[0]?.runningBalance ?? 0;
  const PER_PAGE = 15;
  const totalPages = Math.max(1, Math.ceil(processedLedger.length / PER_PAGE));
  const paginated = processedLedger.slice((ledgerPage - 1) * PER_PAGE, ledgerPage * PER_PAGE);

  const totalDuesAll = filtered.reduce((s, p) => s + getDue(p.id), 0);

  if (isLoading && !customers.length && !suppliers.length) {
    return <LoadingSpinner message="Loading parties..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Status bar — same navy color, covers notch */}
      <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />

      {/* ── Full-bleed Navy Header (covers notch) ──────────────────────── */}
      <View style={[H.header, { paddingTop: insets.top + 8 }]}>

        {/* Title row */}
        <View style={H.titleRow}>
          <View>
            <Text style={H.screenTitle}>{isCustomer ? 'Customers' : 'Suppliers'}</Text>
            <Text style={H.screenSub}>
              {filtered.length} {isCustomer ? 'customer' : 'supplier'}{filtered.length !== 1 ? 's' : ''}
              {totalDuesAll > 0 ? `  ·  ${fmtINR(totalDuesAll)} due` : '  ·  All settled'}
            </Text>
          </View>
          <TouchableOpacity style={[H.addBtn, { backgroundColor: PRIMARY }]} onPress={openAdd} activeOpacity={0.85}>
            <Text style={H.addBtnTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Animated tab switcher */}
        <View style={H.tabWrap}>
          {/* Sliding indicator */}
          <Animated.View style={[H.tabIndicator, {
            left: tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '50%'] }),
            backgroundColor: PRIMARY,
          }]} />
          <TouchableOpacity style={H.tabBtn} onPress={() => setTab('CUSTOMER')} activeOpacity={0.85}>
            <Text style={[H.tabTxt, isCustomer && H.tabTxtActive]}>
              👥  Customers  <Text style={{ fontWeight: '900' }}>{customers.length}</Text>
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={H.tabBtn} onPress={() => setTab('SUPPLIER')} activeOpacity={0.85}>
            <Text style={[H.tabTxt, !isCustomer && H.tabTxtActive]}>
              🚛  Suppliers  <Text style={{ fontWeight: '900' }}>{suppliers.length}</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={H.searchRow}>
          <View style={H.searchBox}>
            <Text style={H.searchIco}>🔍</Text>
            <TextInput
              style={H.searchInput}
              placeholder={`Search by name or phone...`}
              value={search} onChangeText={setSearch}
              placeholderTextColor="rgba(255,255,255,0.35)"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}><Text style={H.searchClear}>✕</Text></TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── List ───────────────────────────────────────────────────────── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={C.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} colors={[PRIMARY]} />}
        ListEmptyComponent={
          <View style={C.emptyBox}>
            <Text style={C.emptyEmoji}>{isCustomer ? '👥' : '🚛'}</Text>
            <Text style={C.emptyTitle}>No {isCustomer ? 'customers' : 'suppliers'} yet</Text>
            <Text style={C.emptySub}>Tap + Add to add your first {isCustomer ? 'customer' : 'supplier'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const due = getDue(item.id);
          const hasDue = due > 0;
          const aColor = avatarColor(item.name);
          return (
            <View style={[C.card, { borderLeftColor: hasDue ? T.rose : PRIMARY }]}>
              {/* Top: avatar + info + due badge */}
              <View style={C.cardTop}>
                <View style={[C.avatar, { backgroundColor: aColor + '18' }]}>
                  <Text style={[C.avatarTxt, { color: aColor }]}>{item.name[0].toUpperCase()}</Text>
                </View>

                <View style={C.cardBody}>
                  <Text style={C.cardName}>{item.name}</Text>
                  <View style={C.metaRow}>
                    {item.phone && <Text style={C.metaChip}>📞 {item.phone}</Text>}
                    {item.state && <Text style={C.metaChip}>🗺 {item.state}</Text>}
                  </View>
                  {item.address && <Text style={C.cardAddr} numberOfLines={1}>📍 {item.address}</Text>}
                  {item.gstNumber && <Text style={C.cardGst}>GST: {item.gstNumber}</Text>}
                </View>

                <View style={[C.dueBadge, { backgroundColor: hasDue ? T.roseBg : T.emeraldBg }]}>
                  <Text style={[C.dueAmt, { color: hasDue ? T.rose : T.emerald }]}>
                    {hasDue ? fmtINR(due) : '✓'}
                  </Text>
                  <Text style={[C.dueLbl, { color: hasDue ? T.rose : T.emerald }]}>
                    {hasDue ? 'Due' : 'Settled'}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={C.sep} />

              {/* Actions Row 1: Edit, Delete, Ledger, Pay */}
              <View style={C.actionRow}>
                <TouchableOpacity style={C.iconBtn} onPress={() => openEdit(item)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[C.iconBtn, { backgroundColor: T.roseBg }]} onPress={() => handleDelete(item.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text>🗑️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[C.outlineBtn, { borderColor: PRIMARY, backgroundColor: PRIMARY_BG }]} onPress={() => openLedger(item)}>
                  <Text style={[C.outlineTxt, { color: PRIMARY_DK }]}>View Ledger</Text>
                </TouchableOpacity>
                {hasDue && (
                  <Animated.View style={{ opacity: pulseAnim }}>
                    <TouchableOpacity onPress={() => openPay(item)} activeOpacity={0.85}>
                      <LinearGradient colors={[PRIMARY, PRIMARY_DK]} style={C.payBtn}>
                        <Text style={C.payTxt}>{isCustomer ? 'Receive' : 'Pay Due'}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>

            </View>
          );
        }}
      />

      {/* ── Add/Edit Modal ─────────────────────────────────────────────── */}
      <UiModal visible={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Party' : `Add ${isCustomer ? 'Customer' : 'Supplier'}`}>
        <Input label="Full Name / Business Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Enter name" required />
        <Input label="Phone Number" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="Mobile number" keyboardType="phone-pad" />
        <Input label="Address" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} placeholder="Full address" multiline />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Input label="State" value={form.state} onChangeText={v => setForm(f => ({ ...f, state: v }))} placeholder="State" /></View>
          <View style={{ flex: 1 }}><Input label="GST No." value={form.gstNumber} onChangeText={v => setForm(f => ({ ...f, gstNumber: v }))} placeholder="GSTIN" autoCapitalize="characters" /></View>
        </View>

        {/* Opening Balance section */}
        <View style={C.obDivider}>
          <View style={C.obDividerLine} />
          <Text style={C.obDividerTxt}>Opening Balance (Optional)</Text>
          <View style={C.obDividerLine} />
        </View>

        {/* Show badge if editing and OB already exists */}
        {editTarget && obDueMap[editTarget.id] && (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#86efac' }}>
            <Text style={{ fontSize: 13, color: '#15803d', fontWeight: '700' }}>
              ✓  Current opening balance: ₹{Number(obDueMap[editTarget.id].totalAmount).toLocaleString('en-IN')}
            </Text>
          </View>
        )}

        <View style={C.obInfoBox}>
          <Text style={C.obInfoTxt}>
            ℹ️  {editTarget
              ? `Change the amount to update the existing opening balance.`
              : `If this ${isCustomer ? 'customer' : 'supplier'} already owes you money from before, enter the amount here.`
            }
          </Text>
        </View>
        <Text style={C.obLabel}>{editTarget && obDueMap[editTarget.id] ? 'Update Amount (₹)' : 'Outstanding Amount (₹)'}</Text>
        <TextInput
          style={C.obAmtInput}
          value={form.openingBalance}
          onChangeText={v => setForm(f => ({ ...f, openingBalance: v }))}
          placeholder="0  —  leave blank if none"
          placeholderTextColor={T.t4}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[C.saveBtn, { backgroundColor: saving ? PRIMARY + 'aa' : PRIMARY }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={C.saveTxt}>{editTarget ? '✓  Update Party' : '+ Add Party'}</Text>
          }
        </TouchableOpacity>
      </UiModal>

      {/* ── Ledger Modal ────────────────────────────────────────────────── */}
      <Modal visible={!!ledgerParty} animationType="slide" onRequestClose={() => setLedgerParty(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: T.bg }}>
          <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />
          {/* Navy Hero Header */}
          <View style={[L.header, { paddingTop: insets.top + 14 }]}>
            <View style={L.navRow}>
              <TouchableOpacity onPress={() => setLedgerParty(null)} style={L.backBtn}>
                <Text style={L.backTxt}>← Back</Text>
              </TouchableOpacity>
              <Text style={L.navTitle}>Ledger</Text>
              <TouchableOpacity onPress={() => setLedgerMenu(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={L.menuDot}>⋮</Text>
              </TouchableOpacity>
            </View>

            <View style={L.partyRow}>
              <View style={[L.bigAvatar, { backgroundColor: avatarColor(ledgerParty?.name || 'A') + '22', borderColor: avatarColor(ledgerParty?.name || 'A') }]}>
                <Text style={[L.bigAvatarTxt, { color: avatarColor(ledgerParty?.name || 'A') }]}>{ledgerParty?.name?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={L.partyName}>{ledgerParty?.name}</Text>
                <View style={L.typeRow}>
                  <View style={L.typePillHdr}><Text style={L.typePillHdrTxt}>{ledgerParty?.type}</Text></View>
                </View>
              </View>
              <View style={L.balBox}>
                <Text style={L.balLbl}>Outstanding</Text>
                <Text style={[L.balAmt, netBalance > 0 && { color: '#fca5a5' }]}>{fmtINR(netBalance)}</Text>
              </View>
            </View>
          </View>

          {/* Summary cards strip */}
          <View style={L.strip}>
            <View style={L.stripCard}>
              <Text style={[L.stripAmt, { color: T.emerald }]}>{fmtINR(totalGiven)}</Text>
              <Text style={L.stripLbl}>Total Received</Text>
            </View>
            <View style={{ width: 1, backgroundColor: T.bdr }} />
            <View style={L.stripCard}>
              <Text style={[L.stripAmt, { color: T.rose }]}>{fmtINR(totalCredit)}</Text>
              <Text style={L.stripLbl}>Total Credit</Text>
            </View>
            <View style={{ width: 1, backgroundColor: T.bdr }} />
            <View style={L.stripCard}>
              <Text style={[L.stripAmt, { color: T.t1 }]}>{processedLedger.length}</Text>
              <Text style={L.stripLbl}>Transactions</Text>
            </View>
          </View>

          {/* Filter Dropdown Button */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: T.bdr }}
            onPress={() => setFilterMenu(true)}
            activeOpacity={0.8}
          >
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: T.navy }}>
              {ledgerFilter === 'ALL' ? 'All Transactions' :
                ledgerFilter === 'TODAY' ? 'Today' :
                  ledgerFilter === 'YESTERDAY' ? 'Yesterday' :
                    ledgerFilter === 'WEEK' ? 'This Week' :
                      ledgerFilter === 'MONTH' ? 'This Month' :
                        ledgerFilter === 'FY' ? 'Financial Year' : 'Custom Range'}
            </Text>
            <Text style={{ fontSize: 12, color: T.t3 }}>▼</Text>
          </TouchableOpacity>

          {/* Custom Range Display */}
          {ledgerFilter === 'CUSTOM' && (
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: T.bg }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: T.bdr }} onPress={() => { setCalTarget('FROM'); setShowDatePicker(true); }}>
                <Text style={{ fontSize: 10, color: T.t3, textTransform: 'uppercase', fontWeight: '800', marginBottom: 2 }}>From Date</Text>
                <Text style={{ fontSize: 14, color: filterFrom ? T.navy : T.t4, fontWeight: '700' }}>{filterFrom || 'Select From'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: T.bdr }} onPress={() => { setCalTarget('TO'); setShowDatePicker(true); }}>
                <Text style={{ fontSize: 10, color: T.t3, textTransform: 'uppercase', fontWeight: '800', marginBottom: 2 }}>To Date</Text>
                <Text style={{ fontSize: 14, color: filterTo ? T.navy : T.t4, fontWeight: '700' }}>{filterTo || 'Select To'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tx list */}
          {ledgerLoading ? (
            <View style={L.center}><ActivityIndicator size="large" color={T.emerald} /></View>
          ) : paginated.length === 0 ? (
            <View style={L.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.t1, marginBottom: 6 }}>No Transactions</Text>
              <Text style={{ fontSize: 13, color: T.t3, textAlign: 'center' }}>No ledger entries found for this party</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {paginated.map((e: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={(e._type === 'SALE' || e._type === 'PURCHASE') ? 0.75 : 1}
                  onPress={() => {
                    if (e._type === 'SALE' || e._type === 'PURCHASE') {
                      setPreviewInvoice({
                        id: e.id || e.referenceId || undefined,
                        type: e._type,
                        invoiceNumber: e.voucherNo || e.invoiceNumber || e.reference,
                        reference: e.voucherNo || e.invoiceNumber || e.reference,
                        date: e.date,
                        partyName: ledgerParty?.name,
                        amount: e.credit || e.given || 0,
                        finalTotal: e.credit || e.given || 0,
                        amountPaid: e.given || e.amountPaid || 0,
                        dueAmount: e.credit || e.dueAmount || 0,
                        items: e.items && e.items.length > 0 ? e.items : undefined,
                      });
                      setShowPreview(true);
                    }
                  }}
                  style={L.txCard}
                >
                  <View style={[L.txAccent, { backgroundColor: e.given > 0 ? T.emerald : T.rose }]} />
                  <View style={{ flex: 1 }}>
                    <View style={L.txTop}>
                      <Text style={L.txDate}>{fmtDate(e.date)}</Text>
                      <Text style={[L.txAmt, { color: e.given > 0 ? T.emerald : T.rose }]}>
                        {e.given > 0 ? `+${fmtINR(e.given)}` : `-${fmtINR(e.credit)}`}
                      </Text>
                    </View>
                    <View style={L.txMid}>
                      <View style={[L.typeTag, {
                        backgroundColor: e._type?.includes('SALE') ? T.emeraldBg
                          : e._type?.includes('PURC') ? T.indigoBg
                            : e._type?.includes('PAY') || e._type?.includes('RECT') || e._type?.includes('PYMT') ? '#fffbeb' : T.bdrL,
                      }]}>
                        <Text style={[L.typeTagTxt, {
                          color: e._type?.includes('SALE') ? T.emeraldDk
                            : e._type?.includes('PURC') ? T.indigoDk
                              : e._type?.includes('PAY') || e._type?.includes('RECT') || e._type?.includes('PYMT') ? T.amber : T.t3,
                        }]}>
                          {e.type?.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <Text style={L.txBal}>Bal: {fmtINR(e.runningBalance)}</Text>
                    </View>
                    {(e.reference || e.description || e.notes) ? (
                      <Text style={L.txDesc} numberOfLines={2}>
                        {[e.reference && `#${e.reference}`, (e.description || e.notes)].filter(Boolean).join('  ·  ')}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}

              {totalPages > 1 && (
                <View style={L.pageRow}>
                  <TouchableOpacity disabled={ledgerPage === 1} onPress={() => setLedgerPage(p => p - 1)} style={[L.pageBtn, ledgerPage === 1 && { opacity: 0.4 }]}>
                    <Text style={L.pageBtnTxt}>◀ Prev</Text>
                  </TouchableOpacity>
                  <Text style={L.pageLbl}>{ledgerPage} / {totalPages}</Text>
                  <TouchableOpacity disabled={ledgerPage === totalPages} onPress={() => setLedgerPage(p => p + 1)} style={[L.pageBtn, ledgerPage === totalPages && { opacity: 0.4 }]}>
                    <Text style={L.pageBtnTxt}>Next ▶</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {/* Menu */}
          <Modal visible={ledgerMenu} transparent animationType="fade" onRequestClose={() => setLedgerMenu(false)}>
            <TouchableOpacity style={L.menuOverlay} activeOpacity={1} onPress={() => setLedgerMenu(false)}>
              <View style={L.menuBox}>
                <TouchableOpacity style={[L.menuItem, { flexDirection: 'row', alignItems: 'center', gap: 10 }]} onPress={() => setLedgerShowNotes(n => !n)}>
                  <View style={{
                    width: 22, height: 22, borderRadius: 5, borderWidth: 2,
                    borderColor: ledgerShowNotes ? '#10b981' : '#cbd5e1',
                    backgroundColor: ledgerShowNotes ? '#10b981' : '#fff',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {ledgerShowNotes && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>}
                  </View>
                  <Text style={L.menuTxt}>Notes</Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: T.bdrL }} />
                <TouchableOpacity style={L.menuItem} onPress={() => {
                  setLedgerMenu(false);
                  downloadLedgerPdf({
                    partyId: ledgerParty?.id,
                    partyName: ledgerParty?.name,
                    fromDate: filterFrom || undefined,
                    toDate: filterTo || undefined,
                    showNotes: ledgerShowNotes
                  });
                }}>
                  <Text style={L.menuTxt}>📄  Download PDF</Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: T.bdrL }} />
                <TouchableOpacity style={L.menuItem} onPress={() => { setLedgerMenu(false); if (ledgerParty) openLedger(ledgerParty); }}>
                  <Text style={L.menuTxt}>🔄  Refresh Data</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Filter Dropdown Modal */}
          <Modal visible={filterMenu} transparent animationType="fade" onRequestClose={() => setFilterMenu(false)}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }} activeOpacity={1} onPress={() => setFilterMenu(false)}>
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 8, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 }}>
                {([
                  { key: 'ALL', label: 'All Transactions' }, { key: 'TODAY', label: 'Today' },
                  { key: 'YESTERDAY', label: 'Yesterday' }, { key: 'WEEK', label: 'This Week' },
                  { key: 'MONTH', label: 'This Month' }, { key: 'FY', label: 'Financial Year' },
                  { key: 'CUSTOM', label: 'Custom Range' },
                ] as const).map(f => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => {
                      setFilterMenu(false);
                      setLedgerFilter(f.key);
                      setLedgerPage(1);
                      if (f.key === 'CUSTOM') { setShowDatePicker(true); setCalTarget('FROM'); }
                    }}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: T.bdrL, backgroundColor: ledgerFilter === f.key ? T.emeraldBg : '#fff', borderRadius: 12 }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: ledgerFilter === f.key ? '800' : '600', color: ledgerFilter === f.key ? T.emeraldDk : T.navy }}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Calendar Picker Modal */}
          <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: T.navy, marginBottom: 16 }}>Select {calTarget === 'FROM' ? 'From' : 'To'} Date</Text>

                {/* Calendar Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} style={{ padding: 10, backgroundColor: T.bg, borderRadius: 10 }}>
                    <Text style={{ fontWeight: '900', color: T.navy }}>◀</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: T.navy }}>
                    {calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} style={{ padding: 10, backgroundColor: T.bg, borderRadius: 10 }}>
                    <Text style={{ fontWeight: '900', color: T.navy }}>▶</Text>
                  </TouchableOpacity>
                </View>

                {/* Calendar Grid */}
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
                      <TouchableOpacity
                        key={d}
                        onPress={() => {
                          if (calTarget === 'FROM') { setFilterFrom(dateStr); setCalTarget('TO'); }
                          else { setFilterTo(dateStr); setShowDatePicker(false); setLedgerPage(1); }
                        }}
                        style={{ width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isSelected ? T.emerald : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: isSelected ? '900' : '600', color: isSelected ? '#fff' : T.navy }}>{d}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={[C.saveBtn, { backgroundColor: T.navy, marginTop: 24 }]} onPress={() => setShowDatePicker(false)}>
                  <Text style={C.saveTxt}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </View>
      </Modal>

      {/* ── Pay Due Modal ─────────────────────────────────────────────── */}
      <Modal visible={!!payParty} transparent animationType="slide" onRequestClose={() => setPayParty(null)}>
        <TouchableOpacity style={PY.overlay} activeOpacity={1} onPress={() => setPayParty(null)}>
          <View style={[PY.sheet, { paddingBottom: Math.max(insets.bottom + 16, 24) }]} onStartShouldSetResponder={() => true}>
            <View style={PY.handle} />

            {/* Party info */}
            <View style={PY.partyRow}>
              <View style={[PY.payAvatar, { backgroundColor: avatarColor(payParty?.name || 'A') + '22' }]}>
                <Text style={[PY.payAvatarTxt, { color: avatarColor(payParty?.name || 'A') }]}>
                  {payParty?.name?.[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={PY.payName}>{payParty?.name}</Text>
                <Text style={PY.payDueLabel}>
                  {isCustomer ? 'To Receive' : 'To Pay'}:
                  <Text style={{ color: T.rose, fontWeight: '900' }}> {fmtINR(getDue(payParty?.id || ''))}</Text>
                </Text>
              </View>
              <TouchableOpacity style={PY.fullAmtBtn} onPress={() => setPayAmt(String(getDue(payParty?.id || '')))}>
                <Text style={PY.fullAmtTxt}>Full Amount</Text>
              </TouchableOpacity>
            </View>

            <Text style={PY.label}>Amount (₹)</Text>
            <TextInput style={PY.input} value={payAmt} onChangeText={setPayAmt} keyboardType="numeric" placeholder="Enter amount" placeholderTextColor={T.t4} />

            <Text style={PY.label}>Date</Text>
            <TextInput style={PY.input} value={payDate} onChangeText={setPayDate} />

            <Text style={PY.label}>Payment Mode</Text>
            <View style={PY.modeRow}>
              {MODES.map(m => (
                <TouchableOpacity key={m} style={[PY.chip, payMode === m && { backgroundColor: PRIMARY_BG, borderColor: PRIMARY }]} onPress={() => setPayMode(m)}>
                  <Text style={[PY.chipTxt, payMode === m && { color: PRIMARY_DK, fontWeight: '800' }]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={PY.label}>Notes <Text style={{ color: T.t4, fontWeight: '400' }}>(optional)</Text></Text>
            <TextInput style={[PY.input, { height: 64, textAlignVertical: 'top', paddingTop: 12 }]} value={payNotes} onChangeText={setPayNotes} placeholder="Add a note..." placeholderTextColor={T.t4} multiline />

            <View style={PY.btnRow}>
              <TouchableOpacity style={PY.cancelBtn} onPress={() => setPayParty(null)}>
                <Text style={PY.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[PY.confirmBtn, { backgroundColor: PRIMARY }]} onPress={handlePay} disabled={paying}>
                {paying ? <ActivityIndicator color="#fff" /> : <Text style={PY.confirmTxt}>{isCustomer ? 'Record Receipt' : 'Record Payment'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <InvoicePreviewModal visible={showPreview} invoice={previewInvoice} onClose={() => { setShowPreview(false); setPreviewInvoice(null); }} />

      {/* ── Auto-dismiss Toast ─────────────────────────────────────── */}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[C.toast, toast.type === 'error' && C.toastError, {
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
            }],
          }]}
        >
          <Text style={C.toastTxt}>{toast.msg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

// ── Header Styles ─────────────────────────────────────────────────────────────
const H = StyleSheet.create({
  header: { backgroundColor: T.navy, paddingHorizontal: 20, paddingBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  screenTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.6 },
  screenSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4, fontWeight: '500' },
  addBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  addBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  tabWrap: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 4, marginBottom: 16, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, bottom: 4, width: '50%', borderRadius: 11, zIndex: 0 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', zIndex: 1 },
  tabTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  tabTxtActive: { color: '#fff', fontWeight: '800' },

  searchRow: { flexDirection: 'row' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 13, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  searchIco: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '500' },
  searchClear: { fontSize: 16, color: 'rgba(255,255,255,0.5)', paddingLeft: 8 },
});

// ── Card Styles ───────────────────────────────────────────────────────────────
const C = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: T.surface, borderRadius: 20, padding: 16, marginBottom: 14,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
    borderWidth: 1, borderColor: T.bdrL,
  },
  cardTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 22, fontWeight: '900' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: '800', color: T.t1, marginBottom: 5, letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 3 },
  metaChip: { fontSize: 12, color: T.t3, fontWeight: '500' },
  cardAddr: { fontSize: 12, color: T.t3, marginTop: 2 },
  cardGst: { fontSize: 11, color: T.t4, marginTop: 3, fontWeight: '500' },

  dueBadge: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, minWidth: 74 },
  dueAmt: { fontSize: 13, fontWeight: '900', textAlign: 'center' },
  dueLbl: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 3, letterSpacing: 0.3 },

  sep: { height: 1, backgroundColor: T.bdrL, marginVertical: 13 },
  actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: T.bdrL, alignItems: 'center', justifyContent: 'center' },
  outlineBtn: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  outlineTxt: { fontSize: 13, fontWeight: '800' },
  payBtn: { height: 40, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payTxt: { fontSize: 13, fontWeight: '800', color: '#fff' },

  saveBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  saveTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Opening Balance
  obInfoBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  obInfoTxt: { fontSize: 13, color: '#1d4ed8', lineHeight: 20 },
  obLabel: { fontSize: 13, fontWeight: '700', color: T.t2, marginBottom: 8, marginTop: 4 },
  obAmtInput: { borderWidth: 1.5, borderColor: T.bdr, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: T.t1, backgroundColor: '#fff', marginBottom: 12, fontWeight: '600' },
  obDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 14, gap: 10 },
  obDividerLine: { flex: 1, height: 1, backgroundColor: T.bdr },
  obDividerTxt: { fontSize: 12, fontWeight: '700', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyBox: { paddingVertical: 72, alignItems: 'center' },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: T.t1, marginBottom: 6 },
  emptySub: { fontSize: 14, color: T.t3, textAlign: 'center' },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    maxWidth: '88%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  toastError: {
    backgroundColor: '#7f1d1d',
    borderColor: '#fca5a5',
  },
  toastTxt: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
});

// ── Ledger Styles ─────────────────────────────────────────────────────────────
const L = StyleSheet.create({
  header: { backgroundColor: T.navy, paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { paddingVertical: 4 },
  backTxt: { color: T.emerald, fontSize: 15, fontWeight: '700' },
  navTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  menuDot: { color: '#fff', fontSize: 26, lineHeight: 26 },

  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bigAvatar: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bigAvatarTxt: { fontSize: 26, fontWeight: '900' },
  partyName: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePillHdr: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typePillHdrTxt: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  partyPhone: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  balBox: { backgroundColor: 'rgba(255,255,255,0.07)', padding: 12, borderRadius: 14, alignItems: 'flex-end', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  balLbl: { fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  balAmt: { fontSize: 17, fontWeight: '900', color: T.emerald },

  strip: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 18, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 5, marginBottom: 8 },
  stripCard: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  stripAmt: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  stripLbl: { fontSize: 10, fontWeight: '700', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  txCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: T.bdrL, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  txAccent: { width: 4 },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingTop: 14, paddingHorizontal: 14 },
  txDate: { fontSize: 14, fontWeight: '800', color: T.t1 },
  txAmt: { fontSize: 16, fontWeight: '900' },
  txMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 14 },
  typeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeTagTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  txBal: { fontSize: 12, fontWeight: '700', color: T.t3 },
  txDesc: { fontSize: 12, color: T.t3, lineHeight: 17, paddingHorizontal: 14, paddingBottom: 12 },

  pageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: T.bdr },
  pageBtnTxt: { fontSize: 13, fontWeight: '700', color: T.t1 },
  pageLbl: { fontSize: 13, fontWeight: '700', color: T.t3 },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 90 : 60 },
  menuBox: { backgroundColor: '#fff', width: 200, borderRadius: 18, marginRight: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 10 },
  menuItem: { padding: 16 },
  menuTxt: { fontSize: 14, fontWeight: '700', color: T.t1 },
});

// ── Pay Modal Styles ──────────────────────────────────────────────────────────
const PY = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  handle: { width: 40, height: 4, backgroundColor: T.bdr, borderRadius: 3, alignSelf: 'center', marginBottom: 22 },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.bdrL, borderRadius: 16, padding: 14, marginBottom: 4, borderWidth: 1, borderColor: T.bdr },
  payAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  payAvatarTxt: { fontSize: 20, fontWeight: '900' },
  payName: { fontSize: 15, fontWeight: '800', color: T.t1, marginBottom: 2 },
  payDueLabel: { fontSize: 13, color: T.t3, fontWeight: '600' },
  fullAmtBtn: { backgroundColor: '#fff1f2', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#fecdd3' },
  fullAmtTxt: { fontSize: 11, fontWeight: '700', color: T.rose },
  label: { fontSize: 13, fontWeight: '700', color: T.t2, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: T.bdr, borderRadius: 13, paddingHorizontal: 16, height: 50, fontSize: 15, fontWeight: '600', color: T.t1 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: T.bdr },
  chipTxt: { fontSize: 13, fontWeight: '600', color: T.t3 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: T.bdr, alignItems: 'center', justifyContent: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '700', color: T.t3 },
  confirmBtn: { flex: 2, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
