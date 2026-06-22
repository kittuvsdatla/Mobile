import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Animated, StatusBar, TextInput, ScrollView, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchPurchases, deletePurchase } from '@/store/slices/purchasesSlice';
import { apiService }        from '@/services/apiService';
import { LoadingSpinner }    from '@/components/ui/LoadingSpinner';
import CreatePurchaseModal   from '@/components/modals/CreatePurchaseModal';
import { InvoicePreviewModal } from '@/components/modals/InvoicePreviewModal';
import type { Purchase }     from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:     '#0f172a',
  navyMid:  '#1e293b',
  bg:       '#f1f5f9',
  surface:  '#ffffff',
  primary:  '#6366f1',  // Indigo for purchases
  primaryBg:'#eef2ff',
  rose:     '#f43f5e',
  roseBg:   '#fff1f2',
  emerald:  '#10b981',
  emeraldBg:'#ecfdf5',
  amber:    '#f59e0b',
  amberBg:  '#fffbeb',
  t1:       '#0f172a',
  t2:       '#334155',
  t3:       '#64748b',
  t4:       '#94a3b8',
  bdr:      '#e2e8f0',
  bdrL:     '#f1f5f9',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmt(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function PurchasesScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((s: RootState) => s.purchases);
  
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const fabScale = React.useRef(new Animated.Value(1)).current;

  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [showPreview,    setShowPreview]    = useState(false);

  const [statusFilter, setStatusFilter] = useState<'ALL'|'PAID'|'PENDING'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL'|'TODAY'|'WEEK'|'MONTH'|'CUSTOM'>('ALL');

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error' }|null>(null);
  const toastAnim   = React.useRef(new Animated.Value(0)).current;
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout>|null>(null);

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(toastAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calTarget, setCalTarget] = useState<'FROM'|'TO'>('FROM');
  const [calMonth, setCalMonth] = useState(new Date());

  const toLocalStr = (d: Date) => {
    if (isNaN(d.getTime())) return '1970-01-01';
    const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dy = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dy}`;
  };



  const filtered = items.filter(p => {
    // 1. Search
    const matchesSearch = p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.partyName || p.party?.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Status
    const isPaid = (p.dueAmount || 0) === 0;
    if (statusFilter === 'PAID' && !isPaid) return false;
    if (statusFilter === 'PENDING' && isPaid) return false;

    // 3. Date
    if (dateFilter !== 'ALL') {
      const d = new Date(p.date);
      const now = new Date();
      if (!isNaN(d.getTime())) {
        if (dateFilter === 'TODAY') {
          if (d.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'WEEK') {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (d < weekAgo) return false;
        } else if (dateFilter === 'MONTH') {
          if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'CUSTOM') {
          const dStr = toLocalStr(d);
          if (filterFrom && dStr < filterFrom) return false;
          if (filterTo && dStr > filterTo) return false;
        }
      }
    }

    return true;
  });

  const totalCost = filtered.reduce((s, i) => s + (i.finalTotal || 0), 0);
  const totalDue  = filtered.reduce((s, i) => s + (i.dueAmount || 0), 0);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchPurchases(undefined));
    setRefreshing(false);
  };

  if (isLoading && !items.length) return (
    <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
      <LoadingSpinner message="Loading purchases..." />
    </View>
  );

  const renderEmpty = () => (
    <View style={S.emptyBox}>
      <Text style={S.emptyIcon}>🛒</Text>
      <Text style={S.emptyTitle}>No Purchases Found</Text>
      <Text style={S.emptySub}>Tap + to record your first purchase.</Text>
    </View>
  );

  const openPreview = (item: Purchase) => {
    setPreviewInvoice({
      id:           item.id,
      type:         'PURCHASE',
      invoiceNumber:item.invoiceNumber,
      reference:    item.invoiceNumber,
      date:         item.date,
      partyName:    item.partyName || item.party?.name,
      amount:       item.finalTotal || 0,
      finalTotal:   item.finalTotal || 0,
      amountPaid:   item.amountPaid || 0,
      dueAmount:    item.dueAmount || 0,
      items:        item.items && item.items.length > 0 ? item.items : undefined,
    });
    setShowPreview(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />

      {/* Header */}
      <View style={[S.headerGrad, { paddingTop: insets.top + 16, backgroundColor: T.navy }]}>
        <View style={S.headerContent}>
          <View>
            <Text style={S.headerTitle}>Purchases</Text>
            <Text style={S.headerSub}>Manage vendor bills & stock inwards</Text>
          </View>
        </View>

        <View style={S.searchBox}>
          <Text style={S.searchIcon}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search by invoice or supplier name..."
            placeholderTextColor={T.t4}
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
          <TouchableOpacity style={[S.fChip, statusFilter==='ALL' && S.fChipActive]} onPress={()=>setStatusFilter('ALL')}>
            <Text style={[S.fTxt, statusFilter==='ALL' && S.fTxtActive]}>All Status</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.fChip, statusFilter==='PAID' && S.fChipActive]} onPress={()=>setStatusFilter('PAID')}>
            <Text style={[S.fTxt, statusFilter==='PAID' && S.fTxtActive]}>Settled</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.fChip, statusFilter==='PENDING' && S.fChipActive]} onPress={()=>setStatusFilter('PENDING')}>
            <Text style={[S.fTxt, statusFilter==='PENDING' && S.fTxtActive]}>Pending</Text>
          </TouchableOpacity>
          
          <View style={S.fDiv} />

          <TouchableOpacity style={[S.fChip, dateFilter==='ALL' && S.fChipActive]} onPress={()=>setDateFilter('ALL')}>
            <Text style={[S.fTxt, dateFilter==='ALL' && S.fTxtActive]}>All Time</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.fChip, dateFilter==='TODAY' && S.fChipActive]} onPress={()=>setDateFilter('TODAY')}>
            <Text style={[S.fTxt, dateFilter==='TODAY' && S.fTxtActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.fChip, dateFilter==='WEEK' && S.fChipActive]} onPress={()=>setDateFilter('WEEK')}>
            <Text style={[S.fTxt, dateFilter==='WEEK' && S.fTxtActive]}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.fChip, dateFilter==='MONTH' && S.fChipActive]} onPress={()=>setDateFilter('MONTH')}>
            <Text style={[S.fTxt, dateFilter==='MONTH' && S.fTxtActive]}>This Month</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[S.fChip, dateFilter==='CUSTOM' && S.fChipActive]} 
            onPress={() => { setDateFilter('CUSTOM'); setCalTarget('FROM'); setShowDatePicker(true); }}
          >
            <Text style={[S.fTxt, dateFilter==='CUSTOM' && S.fTxtActive]}>
              {dateFilter === 'CUSTOM' && filterFrom && filterTo ? `${filterFrom} to ${filterTo}` : 'Custom Date'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Stats row floating */}
      <View style={S.statsRow}>
        <View style={S.statCard}>
          <Text style={S.statLbl}>Filtered</Text>
          <Text style={S.statVal}>{filtered.length}</Text>
        </View>
        <View style={[S.statCard, { borderLeftWidth: 1, borderLeftColor: T.bdrL }]}>
          <Text style={S.statLbl}>Cost</Text>
          <Text style={[S.statVal, { color: T.primary, fontSize: 16 }]}>{fmt(totalCost)}</Text>
        </View>
        <View style={[S.statCard, { borderLeftWidth: 1, borderLeftColor: T.bdrL }]}>
          <Text style={S.statLbl}>Pending</Text>
          <Text style={[S.statVal, { color: T.rose, fontSize: 16 }]}>{fmt(totalDue)}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => {
          const isPaid = (item.dueAmount || 0) === 0;
          return (
            <TouchableOpacity style={S.card} activeOpacity={0.7} onPress={() => openPreview(item)}>
              <View style={S.cardTop}>
                <View style={[S.avatar, { backgroundColor: T.primaryBg }]}>
                  <Text style={S.avatarTxt}>📦</Text>
                </View>
                <View style={S.infoWrap}>
                  <Text style={S.name} numberOfLines={1}>{item.partyName || item.party?.name || 'Walk-in Supplier'}</Text>
                  <View style={S.metaRow}>
                    <View style={[S.badge, { backgroundColor: T.bg }]}><Text style={[S.badgeTxt, { color: T.t2 }]}>{item.invoiceNumber}</Text></View>
                    <View style={[S.badge, { backgroundColor: T.bg }]}><Text style={[S.badgeTxt, { color: T.t3 }]}>{formatDate(item.date)}</Text></View>
                  </View>
                </View>
                <View style={S.qtyWrap}>
                  <Text style={S.qty}>{fmt(item.finalTotal || 0)}</Text>
                  <Text style={[S.unit, isPaid ? { color: T.primary } : { color: T.rose }]}>
                    {isPaid ? '✓ Settled' : `Due: ${fmt(item.dueAmount || 0)}`}
                  </Text>
                </View>
              </View>

              <View style={S.cardDivider} />

              <View style={S.cardBot}>
                <Text style={S.botTxt}>{item.items?.length || 0} Items</Text>
                <View style={{ flex: 1 }} />
                
                <TouchableOpacity style={S.actionBtn} onPress={() => apiService.openPurchasePdf(item.id)}>
                  <Text style={S.actionBtnTxt}>📄 PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.actionBtn, { marginLeft: 8 }]} onPress={() => setEditingPurchase(item)}>
                  <Text style={S.actionBtnTxt}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[S.actionBtn, { backgroundColor: T.roseBg, marginLeft: 8 }]} 
                  onPress={() => Alert.alert('Delete Purchase?', 'This will reverse stock and records.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => dispatch(deletePurchase(item.id)) },
                  ])}
                >
                  <Text style={[S.actionBtnTxt, { color: T.rose }]}>🗑 Del</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <Animated.View style={[S.fab, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={S.fabInner}
          onPress={() => setShowCreate(true)}
          onPressIn={() => Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }).start()}
          activeOpacity={1}
        >
          <Text style={S.fabIcon}>+</Text>
        </TouchableOpacity>
      </Animated.View>

      <CreatePurchaseModal 
        visible={showCreate} 
        onClose={(success) => { setShowCreate(false); if(success) showToast('Purchase Created Successfully!'); }} 
      />
      <CreatePurchaseModal 
        visible={!!editingPurchase} 
        onClose={(success) => { setEditingPurchase(null); if(success) showToast('Purchase Updated Successfully!'); }} 
        initialData={editingPurchase} 
      />
      <InvoicePreviewModal visible={showPreview} invoice={previewInvoice} onClose={() => { setShowPreview(false); setPreviewInvoice(null); }} />
      
      {/* ── Date Picker Modal ─────────────────────────────────────── */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: T.surface, borderRadius: 20, padding: 20 }}>
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
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <Text key={d} style={{ width: '14.28%', textAlign: 'center', fontSize: 12, fontWeight: '800', color: T.t3, marginBottom: 10 }}>{d}</Text>
              ))}
              {Array(new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay()).fill(0).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
              ))}
              {Array.from({length: new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate()}, (_,i) => i+1).map(d => {
                const dateStr = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const isSelected = (calTarget === 'FROM' ? filterFrom : filterTo) === dateStr;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      if (calTarget === 'FROM') { setFilterFrom(dateStr); setCalTarget('TO'); }
                      else { setFilterTo(dateStr); setShowDatePicker(false); }
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

            <TouchableOpacity style={{ backgroundColor: T.navy, marginTop: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }} onPress={() => setShowDatePicker(false)}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Toast Notification */}
      {toast && (
        <Animated.View style={[
          S.toastCont,
          toast.type === 'error' && S.toastErr,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
          }
        ]}>
          <Text style={[S.toastTxt, toast.type === 'error' && S.toastTxtErr]}>{toast.msg}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  headerGrad:   { paddingHorizontal: 20, paddingBottom: 68, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle:  { fontSize: 26, fontWeight: '800', color: T.surface, letterSpacing: -0.5 },
  headerSub:    { fontSize: 14, color: '#cbd5e1', marginTop: 4 },
  
  searchBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  searchIcon:   { fontSize: 16, marginRight: 8, opacity: 0.8 },
  searchInput:  { flex: 1, color: T.surface, fontSize: 15, fontWeight: '500' },
  searchClear:  { padding: 6 },
  clearTxt:     { color: T.surface, fontSize: 16, opacity: 0.8 },

  filterRow:    { gap: 8, marginTop: 16, paddingBottom: 4 },
  fChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  fChipActive:  { backgroundColor: T.surface, borderColor: T.surface },
  fTxt:         { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  fTxtActive:   { color: T.navy, fontWeight: '800' },
  fDiv:         { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 6, marginHorizontal: 4 },

  statsRow:     { flexDirection: 'row', backgroundColor: T.surface, marginHorizontal: 20, borderRadius: 16, paddingVertical: 16, marginTop: -30, elevation: 4, shadowColor: T.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  statCard:     { flex: 1, alignItems: 'center' },
  statLbl:      { fontSize: 12, fontWeight: '600', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal:      { fontSize: 20, fontWeight: '800', color: T.t1 },

  list:         { padding: 20, paddingTop: 16, paddingBottom: 100 },
  
  emptyBox:     { padding: 40, alignItems: 'center', marginTop: 20 },
  emptyIcon:    { fontSize: 48, marginBottom: 16, opacity: 0.8 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: T.t2, marginBottom: 8 },
  emptySub:     { fontSize: 14, color: T.t3, textAlign: 'center', lineHeight: 20 },

  card:         { backgroundColor: T.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.bdr, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { fontSize: 20 },
  infoWrap:     { flex: 1 },
  name:         { fontSize: 16, fontWeight: '700', color: T.t1, marginBottom: 4 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  qtyWrap:      { alignItems: 'flex-end' },
  qty:          { fontSize: 16, fontWeight: '800', color: T.t1 },
  unit:         { fontSize: 12, color: T.t4, fontWeight: '700', marginTop: 2 },
  
  cardDivider:  { height: 1, backgroundColor: T.bdrL, marginVertical: 12 },
  cardBot:      { flexDirection: 'row', alignItems: 'center' },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt:     { fontSize: 10, fontWeight: '700' },
  botTxt:       { fontSize: 12, color: T.t3, fontWeight: '600' },
  
  actionBtn:    { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: T.primaryBg, borderRadius: 8 },
  actionBtnTxt: { fontSize: 12, fontWeight: '700', color: T.primary },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    shadowColor: T.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  fabInner: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: T.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  fabIcon: { fontSize: 32, color: '#ffffff', fontWeight: '400', lineHeight: 36, marginTop: -2 },

  toastCont: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: T.emeraldBg, borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 4, shadowColor: T.emerald, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  toastErr:  { backgroundColor: T.roseBg, borderColor: '#fecdd3', shadowColor: T.rose },
  toastTxt:  { color: T.emerald, fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },
  toastTxtErr:{ color: T.rose },
});
