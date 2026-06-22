import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput, StatusBar, Animated, Modal, ScrollView, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchTransporters, addTransporter, editTransporter, removeTransporter } from '@/store/slices/transportersSlice';
import { apiService } from '@/services/apiService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal as UiModal } from '@/components/ui/Modal';
import { Input }          from '@/components/ui/Input';
import { Button }         from '@/components/ui/Button';
import { InvoicePreviewModal } from '@/components/modals/InvoicePreviewModal';
import { downloadLedgerPdf } from '@/services/downloadHelper';
import type { Transporter } from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:     '#0f172a',
  navyMid:  '#1e293b',
  bg:       '#f1f5f9',
  surface:  '#ffffff',
  primary:  '#f59e0b',  // Amber/Orange for transporters
  primaryBg:'#fffbeb',
  rose:     '#f43f5e',
  roseBg:   '#fff1f2',
  emerald:  '#10b981',
  emeraldBg:'#ecfdf5',
  amber:    '#f59e0b',
  amberBg:  '#fffbeb',
  indigo:   '#6366f1',
  indigoBg: '#e0e7ff',
  t1:       '#0f172a',
  t2:       '#334155',
  t3:       '#64748b',
  t4:       '#94a3b8',
  bdr:      '#e2e8f0',
  bdrL:     '#f1f5f9',
};

export default function TransportersScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((state: RootState) => state.transporters);
  
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Transporter | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving,     setSaving]     = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', vehicleNumber: '', address: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const errorAnim = React.useRef(new Animated.Value(0)).current;

  // Ledger Modal
  const [ledgerTransporter, setLedgerTransporter] = useState<Transporter | null>(null);
  const [ledgerData, setLedgerData] = useState<any[] | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string, type: 'SALE' | 'PURCHASE' } | null>(null);

  const [ledgerFilter, setLedgerFilter] = useState<'ALL'|'TODAY'|'YESTERDAY'|'WEEK'|'MONTH'|'FY'|'CUSTOM'>('ALL');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [ledgerMenu, setLedgerMenu] = useState(false);
  const [filterMenu, setFilterMenu] = useState(false);
  const [ledgerShowNotes, setLedgerShowNotes] = useState(false);

  const showFormError = (msg: string) => {
    setFormError(msg);
    errorAnim.setValue(0);
    Animated.spring(errorAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }).start();
  };

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



  const filtered = items.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchTransporters());
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', vehicleNumber: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (t: Transporter) => {
    setEditTarget(t);
    setForm({ name: t.name, phone: t.phone || '', vehicleNumber: t.vehicleNumber || '', address: t.address || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showFormError('Transporter name is required');
      return;
    }
    
    setSaving(true);
    try {
      if (editTarget) {
        await dispatch(editTransporter({ id: editTarget.id, data: form }));
        setShowModal(false);
        showToast(`✓  ${form.name} updated successfully`);
      } else {
        await dispatch(addTransporter(form));
        setShowModal(false);
        showToast(`✓  ${form.name} added successfully`);
      }
    } catch {
      showFormError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transporter', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeTransporter(id)) },
    ]);
  };

  const openLedger = async (transporter: Transporter) => {
    setLedgerTransporter(transporter);
    setLedgerLoading(true);
    setLedgerMenu(false);
    setLedgerFilter('ALL');
    setFilterFrom('');
    setFilterTo('');
    try {
      const res = await apiService.getTransporterLedger(transporter.id);
      if (res.success && res.data) {
        setLedgerData(res.data);
      } else {
        setLedgerData(null);
      }
    } catch {
      setLedgerData(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  if (isLoading && items.length === 0) { 
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
        <LoadingSpinner message="Loading transporters..." />
      </View>
    ); 
  }

  const renderEmpty = () => (
    <View style={S.emptyBox}>
      <Text style={S.emptyIcon}>🚛</Text>
      <Text style={S.emptyTitle}>No Transporters Found</Text>
      <Text style={S.emptySub}>Tap + Add to add your first transporter.</Text>
    </View>
  );

  const processedLedger = (() => {
    if (!ledgerData) return [];
    const safeDate = (dateStr: any) => {
      if (!dateStr) return new Date(0);
      const d = new Date(typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr);
      return isNaN(d.getTime()) ? new Date(0) : d;
    };
    const sorted = [...ledgerData].sort((a, b) => safeDate(b.date).getTime() - safeDate(a.date).getTime());
    
    let filtered = sorted;
    if (filterFrom) {
      const fDate = safeDate(filterFrom);
      fDate.setHours(0,0,0,0);
      filtered = filtered.filter(tx => safeDate(tx.date) >= fDate);
    }
    if (filterTo) {
      const tDate = safeDate(filterTo);
      tDate.setHours(23,59,59,999);
      filtered = filtered.filter(tx => safeDate(tx.date) <= tDate);
    }
    return filtered;
  })();

  const vehiclesCount = items.filter(t => t.vehicleNumber).length;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />
      
      <View style={[S.headerGrad, { paddingTop: insets.top + 16, backgroundColor: T.navy }]}>
        <View style={S.headerContent}>
          <View>
            <Text style={S.headerTitle}>Transporters</Text>
            <Text style={S.headerSub}>Manage your logistics</Text>
          </View>
          <TouchableOpacity style={S.addBtn} onPress={openAdd}>
            <Text style={S.addBtnTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={S.searchBox}>
          <Text style={S.searchIcon}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search name or vehicle no..."
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
      </View>

      <View style={S.statsRow}>
        <View style={S.statCard}>
          <Text style={S.statLbl}>Total</Text>
          <Text style={S.statVal}>{items.length}</Text>
        </View>
        <View style={[S.statCard, { borderLeftWidth: 1, borderLeftColor: T.bdrL }]}>
          <Text style={S.statLbl}>Vehicles</Text>
          <Text style={[S.statVal, { color: T.primary }]}>{vehiclesCount}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={S.card}>
            <View style={S.cardTop}>
              <View style={[S.avatar, { backgroundColor: T.primaryBg }]}>
                <Text style={S.avatarTxt}>🚛</Text>
              </View>
              <View style={S.infoWrap}>
                <Text style={S.name} numberOfLines={1}>{item.name}</Text>
                <View style={S.metaRow}>
                  {item.phone ? (
                    <View style={[S.badge, { backgroundColor: T.bg }]}><Text style={[S.badgeTxt, { color: T.t2 }]}>📞 {item.phone}</Text></View>
                  ) : null}
                  {item.vehicleNumber ? (
                    <View style={[S.badge, { backgroundColor: T.emeraldBg }]}><Text style={[S.badgeTxt, { color: T.emerald }]}>🚗 {item.vehicleNumber}</Text></View>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={S.cardDivider} />

            <View style={S.cardBot}>
              {item.address ? (
                <Text style={[S.botTxt, { flex: 1, marginRight: 10 }]} numberOfLines={1}>📍 {item.address}</Text>
              ) : <View style={{ flex: 1 }} />}
              
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: T.primaryBg, marginLeft: 8 }]} onPress={() => openLedger(item)}>
                <Text style={[S.actionBtnTxt, { color: T.primary }]}>📒 Ledger</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, { marginLeft: 8 }]} onPress={() => openEdit(item)}>
                <Text style={S.actionBtnTxt}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: T.roseBg, marginLeft: 8 }]} onPress={() => handleDelete(item.id)}>
                <Text style={S.actionBtnTxt}>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <UiModal visible={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Transporter' : 'Add Transporter'}>
        {formError && (
          <Animated.View style={[
            S.formErrorBanner,
            {
              opacity: errorAnim,
              transform: [{
                translateY: errorAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] })
              }, {
                scale: errorAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] })
              }]
            }
          ]}>
            <Text style={S.formErrorTxt}>⚠️  {formError}</Text>
          </Animated.View>
        )}
        <Input label="Name" value={form.name} onChangeText={v => { setForm(f => ({ ...f, name: v })); setFormError(null); }} placeholder="Transporter name" required />
        <Input label="Phone" value={form.phone} onChangeText={v => { setForm(f => ({ ...f, phone: v })); setFormError(null); }} placeholder="Phone number" keyboardType="phone-pad" leftIcon="📞" />
        <Input label="Vehicle Number" value={form.vehicleNumber} onChangeText={v => { setForm(f => ({ ...f, vehicleNumber: v })); setFormError(null); }} placeholder="e.g. AP39 AB 1234" autoCapitalize="characters" leftIcon="🚗" />
        <Input label="Address" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} placeholder="Address" multiline />
        <Button loading={saving} title={editTarget ? 'Update' : 'Add Transporter'} onPress={handleSave} fullWidth style={{ marginTop: 12, backgroundColor: T.primary }} />
      </UiModal>

      {/* Ledger Modal (Rich UI) */}
      <Modal visible={!!ledgerTransporter} animationType="slide" onRequestClose={() => setLedgerTransporter(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: T.bg }}>
          <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />
          
          {/* Navy Hero Header */}
          <View style={[L.header, { paddingTop: insets.top + 14 }]}>
            <View style={L.navRow}>
              <TouchableOpacity onPress={() => setLedgerTransporter(null)} style={L.backBtn}>
                <Text style={L.backTxt}>← Back</Text>
              </TouchableOpacity>
              <Text style={L.navTitle}>Ledger</Text>
              <TouchableOpacity onPress={() => setLedgerMenu(true)} style={L.backBtn}>
                <Text style={L.backTxt}>⋮ More</Text>
              </TouchableOpacity>
            </View>

            <View style={L.partyRow}>
              <View style={[L.bigAvatar, { backgroundColor: T.primaryBg, borderColor: T.primary }]}>
                <Text style={[L.bigAvatarTxt, { color: T.primary }]}>🚛</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={L.partyName}>{ledgerTransporter?.name}</Text>
                <View style={L.typeRow}>
                  {ledgerTransporter?.vehicleNumber && (
                    <View style={L.typePillHdr}><Text style={L.typePillHdrTxt}>{ledgerTransporter.vehicleNumber}</Text></View>
                  )}
                  {ledgerTransporter?.phone && (
                    <Text style={L.partyPhone}>📞 {ledgerTransporter.phone}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Summary cards strip */}
          <View style={L.strip}>
            <View style={L.stripCard}>
              <Text style={[L.stripAmt, { color: T.primary }]}>
                ₹{processedLedger.reduce((s, tx) => s + (tx.transportCharges || 0), 0).toLocaleString()}
              </Text>
              <Text style={L.stripLbl}>Total Charges</Text>
            </View>
            <View style={{ width: 1, backgroundColor: T.bdr }} />
            <View style={L.stripCard}>
              <Text style={[L.stripAmt, { color: T.t1 }]}>{processedLedger.length}</Text>
              <Text style={L.stripLbl}>Transactions</Text>
            </View>
          </View>

          {/* Filters Bar */}
          <View style={L.filterWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={L.filterScroll}>
              <TouchableOpacity style={L.filterBtn} onPress={() => setFilterMenu(true)}>
                <Text style={L.filterIco}>📅</Text>
                <Text style={L.filterTxt}>
                  {ledgerFilter === 'ALL' ? 'All Time' :
                   ledgerFilter === 'TODAY' ? 'Today' :
                   ledgerFilter === 'WEEK' ? 'This Week' :
                   ledgerFilter === 'MONTH' ? 'This Month' :
                   ledgerFilter === 'YESTERDAY' ? 'Yesterday' :
                   ledgerFilter === 'FY' ? 'Financial Year' : 'Custom Range'}
                </Text>
                <Text style={L.filterArr}>▼</Text>
              </TouchableOpacity>
              {(filterFrom || filterTo) && (
                <View style={L.activeFilterPill}>
                  <Text style={L.activeFilterTxt}>
                    {filterFrom ? new Date(filterFrom).toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) : 'Start'} 
                    {' - '} 
                    {filterTo ? new Date(filterTo).toLocaleDateString('en-IN', {day:'2-digit', month:'short'}) : 'Now'}
                  </Text>
                  <TouchableOpacity onPress={() => { setLedgerFilter('ALL'); setFilterFrom(''); setFilterTo(''); }}>
                    <Text style={L.activeFilterClear}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>

          {/* Tx list */}
          {ledgerLoading ? (
            <View style={L.center}><ActivityIndicator size="large" color={T.primary} /></View>
          ) : processedLedger.length === 0 ? (
            <View style={L.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.t1, marginBottom: 6 }}>No Transactions</Text>
              <Text style={{ fontSize: 13, color: T.t3, textAlign: 'center' }}>No ledger entries found for this transporter</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {processedLedger.map((tx: any, i: number) => (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.75}
                  onPress={() => setSelectedInvoice({ id: tx.id, type: tx.type })}
                  style={L.txCard}
                >
                  <View style={[L.txAccent, { backgroundColor: tx.type === 'SALE' ? T.emerald : T.indigo }]} />
                  <View style={{ flex: 1 }}>
                    <View style={L.txTop}>
                      <Text style={L.txDate}>{tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : ''}</Text>
                      <Text style={[L.txAmt, { color: T.primary }]}>+₹{(tx.transportCharges || 0).toLocaleString()}</Text>
                    </View>
                    <View style={L.txMid}>
                      <View style={[L.typeTag, {
                        backgroundColor: tx.type === 'SALE' ? T.emeraldBg : T.indigoBg,
                      }]}>
                        <Text style={[L.typeTagTxt, {
                          color: tx.type === 'SALE' ? T.emerald : T.indigo,
                        }]}>
                          {tx.type}
                        </Text>
                      </View>
                      <Text style={L.txBal}>Inv: ₹{(tx.totalAmount || 0).toLocaleString()}</Text>
                    </View>
                    <Text style={L.txDesc} numberOfLines={2}>
                      {[tx.invoiceNumber && `#${tx.invoiceNumber}`, tx.partyName].filter(Boolean).join('  ·  ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Menus */}
          {ledgerMenu && (
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
                    transporterId: ledgerTransporter?.id,
                    transporterName: ledgerTransporter?.name,
                    fromDate: filterFrom || undefined,
                    toDate: filterTo || undefined,
                    showNotes: ledgerShowNotes
                  });
                }}>
                  <Text style={L.menuTxt}>📄  Download PDF</Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: T.bdrL }} />
                <TouchableOpacity style={L.menuItem} onPress={() => { setLedgerMenu(false); if (ledgerTransporter) openLedger(ledgerTransporter); }}>
                  <Text style={L.menuTxt}>🔄  Refresh Data</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

          {filterMenu && (
            <TouchableOpacity style={L.menuOverlayCenter} activeOpacity={1} onPress={() => setFilterMenu(false)}>
              <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 8, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 }}>
                {([
                  { key: 'ALL', label: 'All Transactions' }, { key: 'TODAY', label: 'Today' },
                  { key: 'YESTERDAY', label: 'Yesterday' }, { key: 'WEEK', label: 'This Week' },
                  { key: 'MONTH', label: 'This Month' }, { key: 'FY', label: 'Financial Year' },
                  { key: 'CUSTOM', label: 'Custom Range' },
                ] as const).map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={{ paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, backgroundColor: ledgerFilter === f.key ? T.primaryBg : '#fff', marginBottom: 4 }}
                    onPress={() => {
                      setLedgerFilter(f.key);
                      setFilterMenu(false);
                      const now = new Date();
                      if (f.key === 'ALL') { setFilterFrom(''); setFilterTo(''); }
                      if (f.key === 'TODAY') { const d = now.toISOString().split('T')[0]; setFilterFrom(d); setFilterTo(d); }
                      if (f.key === 'YESTERDAY') { const d = new Date(now); d.setDate(d.getDate()-1); const ds = d.toISOString().split('T')[0]; setFilterFrom(ds); setFilterTo(ds); }
                      if (f.key === 'WEEK') {
                        const start = new Date(now); start.setDate(now.getDate() - now.getDay());
                        setFilterFrom(start.toISOString().split('T')[0]); setFilterTo(now.toISOString().split('T')[0]);
                      }
                      if (f.key === 'MONTH') {
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        setFilterFrom(start.toISOString().split('T')[0]); setFilterTo(now.toISOString().split('T')[0]);
                      }
                      if (f.key === 'FY') {
                        const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                        const start = new Date(fyStartYear, 3, 1);
                        setFilterFrom(start.toISOString().split('T')[0]); setFilterTo(now.toISOString().split('T')[0]);
                      }
                      if (f.key === 'CUSTOM') {
                        Alert.prompt('Custom Filter', 'Enter start date (YYYY-MM-DD)', (start) => {
                          if (!start) return;
                          setTimeout(() => {
                            Alert.prompt('Custom Filter', 'Enter end date (YYYY-MM-DD)', (end) => {
                              if (end) { setFilterFrom(start); setFilterTo(end); }
                            });
                          }, 500);
                        });
                      }
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: ledgerFilter === f.key ? '700' : '500', color: ledgerFilter === f.key ? T.primary : T.t1 }}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          )}

        </View>
      </Modal>

      {/* Invoice Preview */}
      <InvoicePreviewModal
        visible={!!selectedInvoice}
        invoice={selectedInvoice ? {
          id: selectedInvoice.id,
          type: selectedInvoice.type,
          invoiceNumber: '',
          date: '',
        } as any : null}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* ── Auto-dismiss Toast ─────────────────────────────────────── */}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[S.toast, toast.type === 'error' && S.toastError, {
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }),
            }],
          }]}
        >
          <Text style={S.toastTxt}>{toast.msg}</Text>
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
  
  addBtn:       { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  addBtnTxt:    { color: T.surface, fontWeight: '700', fontSize: 14 },

  searchBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, height: 46 },
  searchIcon:   { fontSize: 16, marginRight: 8, opacity: 0.8 },
  searchInput:  { flex: 1, color: T.surface, fontSize: 15, fontWeight: '500' },
  searchClear:  { padding: 6 },
  clearTxt:     { color: T.surface, fontSize: 16, opacity: 0.8 },

  statsRow:     { flexDirection: 'row', backgroundColor: T.surface, marginHorizontal: 20, borderRadius: 16, paddingVertical: 16, marginTop: -30, elevation: 4, shadowColor: T.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
  statCard:     { flex: 1, alignItems: 'center' },
  statLbl:      { fontSize: 12, fontWeight: '600', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statVal:      { fontSize: 22, fontWeight: '800', color: T.t1 },

  list:         { padding: 20, paddingTop: 16, paddingBottom: 40 },
  
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
  
  cardDivider:  { height: 1, backgroundColor: T.bdrL, marginVertical: 12 },
  cardBot:      { flexDirection: 'row', alignItems: 'center' },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt:     { fontSize: 10, fontWeight: '700' },
  botTxt:       { fontSize: 13, color: T.t3, fontWeight: '500' },
  
  actionBtn:    { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fef3c7', borderRadius: 8, alignItems: 'center' },
  actionBtnTxt: { fontSize: 12, fontWeight: '700', color: T.t2 },

  formErrorBanner: { backgroundColor: T.roseBg, padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#fda4af', flexDirection: 'row', alignItems: 'center' },
  formErrorTxt:  { color: T.rose, fontWeight: '700', fontSize: 13, flex: 1 },

  toast:        { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: T.navy, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, alignItems: 'center' },
  toastError:   { backgroundColor: T.rose },
  toastTxt:     { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});

// ── Ledger Styles ─────────────────────────────────────────────────────────────
const L = StyleSheet.create({
  header:       { backgroundColor: T.navy, paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  navRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn:      { padding: 12, marginHorizontal: -8 },
  backTxt:      { color: T.primary, fontSize: 15, fontWeight: '700' },
  navTitle:     { fontSize: 16, fontWeight: '800', color: '#fff' },

  partyRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bigAvatar:    { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  bigAvatarTxt: { fontSize: 26, fontWeight: '900' },
  partyName:    { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
  typeRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePillHdr:  { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typePillHdrTxt:{ fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  partyPhone:   { fontSize: 12, color: 'rgba(255,255,255,0.45)' },

  strip:        { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginTop: -20, borderRadius: 18, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 5, marginBottom: 8 },
  stripCard:    { flex: 1, paddingVertical: 16, alignItems: 'center' },
  stripAmt:     { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  stripLbl:     { fontSize: 10, fontWeight: '700', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.3 },

  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  
  filterWrap:   { borderBottomWidth: 1, borderBottomColor: T.bdr, backgroundColor: '#f8fafc' },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  filterBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: T.bdr, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  filterIco:    { fontSize: 14, marginRight: 6 },
  filterTxt:    { fontSize: 13, fontWeight: '600', color: T.t2, marginRight: 6 },
  filterArr:    { fontSize: 10, color: T.t4 },
  activeFilterPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.primaryBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: T.primary },
  activeFilterTxt:  { fontSize: 13, fontWeight: '700', color: T.primary, marginRight: 8 },
  activeFilterClear:{ fontSize: 14, color: T.primary, fontWeight: '800' },

  menuOverlay:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', padding: 20, paddingTop: 100 },
  menuOverlayCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  menuBox:      { width: 220, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  menuItem:     { paddingVertical: 16, paddingHorizontal: 20 },
  menuTxt:      { fontSize: 15, fontWeight: '600', color: T.t1 },

  txCard:       { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: T.bdrL, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  txAccent:     { width: 4 },
  txTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingTop: 14, paddingHorizontal: 14 },
  txDate:       { fontSize: 14, fontWeight: '800', color: T.t1 },
  txAmt:        { fontSize: 16, fontWeight: '900' },
  txMid:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 14 },
  typeTag:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeTagTxt:   { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  txBal:        { fontSize: 12, fontWeight: '700', color: T.t3 },
  txDesc:       { fontSize: 12, color: T.t3, lineHeight: 17, paddingHorizontal: 14, paddingBottom: 12 },
});
