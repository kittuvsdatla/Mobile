import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal, ScrollView, ActivityIndicator, Switch, TextInput, StatusBar, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  fetchEmployees, addEmployee, editEmployee,
  removeEmployee, updateEmployeePermissions,
} from '@/store/slices/employeesSlice';
import { apiService } from '@/services/apiService';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal as UiModal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InvoicePreviewModal } from '@/components/modals/InvoicePreviewModal';
import { downloadLedgerPdf } from '@/services/downloadHelper';
import type { Employee, EmployeePermissions } from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:     '#0f172a',
  navyMid:  '#1e293b',
  bg:       '#f1f5f9',
  surface:  '#ffffff',
  primary:  '#3b82f6',  // Blue for employees
  primaryBg:'#eff6ff',
  rose:     '#f43f5e',
  roseBg:   '#fff1f2',
  emerald:  '#10b981',
  emeraldBg:'#ecfdf5',
  amber:    '#f59e0b',
  amberBg:  '#fffbeb',
  purple:   '#8b5cf6',
  purpleBg: '#f5f3ff',
  t1:       '#0f172a',
  t2:       '#334155',
  t3:       '#64748b',
  t4:       '#94a3b8',
  bdr:      '#e2e8f0',
  bdrL:     '#f1f5f9',
};

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'HALFDAY', 'LEAVE'] as const;

const PERMISSION_FIELDS: Array<{ key: keyof EmployeePermissions; label: string }> = [
  { key: 'canViewSales', label: 'View Sales' },
  { key: 'canAddSale', label: 'Create Sales' },
  { key: 'canViewPurchases', label: 'View Purchases' },
  { key: 'canAddPurchase', label: 'Create Purchases' },
  { key: 'canViewStock', label: 'View Stock' },
  { key: 'canManageParties', label: 'Manage Parties' },
  { key: 'canReceiveDue', label: 'Receive Dues' },
  { key: 'canViewReports', label: 'View Reports' },
];

const DEFAULT_PERMISSIONS: EmployeePermissions = {
  canViewSales: false, canAddSale: false,
  canViewPurchases: false, canAddPurchase: false,
  canViewStock: false, canManageParties: false,
  canReceiveDue: false, canViewReports: false,
};

export default function EmployeesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { items, isLoading } = useSelector((state: RootState) => state.employees);

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add/Edit Employee Modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', designation: '', salary: '',
  });
  
  const [formError, setFormError] = useState<string | null>(null);
  const errorAnim = React.useRef(new Animated.Value(0)).current;

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

  // Attendance Modal
  const [attTarget, setAttTarget] = useState<Employee | null>(null);
  const [attStatus, setAttStatus] = useState<typeof ATTENDANCE_STATUSES[number]>('PRESENT');
  const [isMarking, setIsMarking] = useState(false);

  // Ledger Modal
  const [ledgerEmployee, setLedgerEmployee] = useState<Employee | null>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string, type: 'SALE' | 'PURCHASE' } | null>(null);

  const [ledgerFilter, setLedgerFilter] = useState<'ALL'|'TODAY'|'YESTERDAY'|'WEEK'|'MONTH'|'FY'|'CUSTOM'>('ALL');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');
  const [ledgerMenu, setLedgerMenu] = useState(false);
  const [filterMenu, setFilterMenu] = useState(false);
  const [ledgerShowNotes, setLedgerShowNotes] = useState(false);

  // Permissions Modal
  const [permEmployee, setPermEmployee] = useState<Employee | null>(null);
  const [permissions, setPermissions] = useState<EmployeePermissions>(DEFAULT_PERMISSIONS);
  const [savingPerms, setSavingPerms] = useState(false);



  const filtered = items.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.designation?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchEmployees());
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', email: '', designation: '', salary: '' });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({
      name: emp.name, phone: emp.phone,
      email: emp.email || '', designation: emp.designation || '',
      salary: emp.salary ? String(emp.salary) : '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      showFormError('Name and phone are required');
      return; 
    }

    // Check for duplicate phone number
    const isDuplicate = items.some(e => e.phone === form.phone && e.id !== editTarget?.id);
    if (isDuplicate) {
      showFormError('This phone number is already registered to another employee');
      return;
    }
    
    setSaving(true);
    const data = {
      name: form.name, phone: form.phone,
      email: form.email || undefined,
      designation: form.designation || undefined,
      salary: form.salary ? Number(form.salary) : undefined,
    };
    
    try {
      if (editTarget) {
        await dispatch(editEmployee({ id: editTarget.id, data }));
        setShowModal(false);
        showToast(`✓  ${form.name} updated successfully`);
      } else {
        await dispatch(addEmployee(data));
        setShowModal(false);
        showToast(`✓  ${form.name} added successfully`);
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Employee', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => dispatch(removeEmployee(id)) },
    ]);
  };

  const handleMarkAttendance = async () => {
    if (!attTarget) { return; }
    setIsMarking(true);
    try {
      await apiService.markAttendance({ employeeId: attTarget.id, status: attStatus });
      setAttTarget(null);
      showToast(`✓ Attendance Marked for ${attTarget.name}`);
    } catch {
      Alert.alert('Error', 'Failed to mark attendance');
    } finally {
      setIsMarking(false);
    }
  };

  const openLedger = async (emp: Employee) => {
    setLedgerEmployee(emp);
    setLedgerLoading(true);
    setLedgerMenu(false);
    setLedgerFilter('ALL');
    setFilterFrom('');
    setFilterTo('');
    try {
      const res = await apiService.getEmployeeLedger(emp.id);
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

  const openPermissions = (emp: Employee) => {
    setPermEmployee(emp);
    setPermissions({ ...DEFAULT_PERMISSIONS, ...(emp.permissions || {}) });
  };

  const handleSavePermissions = async () => {
    if (!permEmployee) { return; }
    setSavingPerms(true);
    try {
      await dispatch(updateEmployeePermissions({ id: permEmployee.id, data: permissions })).unwrap();
      showToast(`✓ Permissions saved for ${permEmployee.name}`);
      setPermEmployee(null);
    } catch {
      Alert.alert('Error', 'Failed to update permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  if (isLoading && !items.length) { 
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
        <LoadingSpinner message="Loading employees..." />
      </View>
    ); 
  }

  const renderEmpty = () => (
    <View style={S.emptyBox}>
      <Text style={S.emptyIcon}>👷</Text>
      <Text style={S.emptyTitle}>No Employees Found</Text>
      <Text style={S.emptySub}>Tap + Add to onboard your first employee.</Text>
    </View>
  );

  const processedLedgerData = (() => {
    if (!ledgerData) return { sales: [], purchases: [], dues: [] };
    const safeDate = (dateStr: any) => {
      if (!dateStr) return new Date(0);
      const d = new Date(typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr);
      return isNaN(d.getTime()) ? new Date(0) : d;
    };
    
    let sales = [...(ledgerData.sales || [])];
    let purchases = [...(ledgerData.purchases || [])];
    let dues = [...(ledgerData.dues || [])];

    if (filterFrom) {
      const fDate = safeDate(filterFrom);
      fDate.setHours(0,0,0,0);
      sales = sales.filter(x => safeDate(x.date) >= fDate);
      purchases = purchases.filter(x => safeDate(x.date) >= fDate);
      dues = dues.filter(x => safeDate(x.createdAt) >= fDate);
    }
    if (filterTo) {
      const tDate = safeDate(filterTo);
      tDate.setHours(23,59,59,999);
      sales = sales.filter(x => safeDate(x.date) <= tDate);
      purchases = purchases.filter(x => safeDate(x.date) <= tDate);
      dues = dues.filter(x => safeDate(x.createdAt) <= tDate);
    }
    return { sales, purchases, dues };
  })();

  const uniqueRoles = new Set(items.map(e => e.designation).filter(Boolean)).size;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />
      
      {/* Header — Solid Navy */}
      <View style={[S.headerGrad, { paddingTop: insets.top + 16, backgroundColor: T.navy }]}>
        <View style={S.headerContent}>
          <View>
            <Text style={S.headerTitle}>Employees</Text>
            <Text style={S.headerSub}>Manage staff and access</Text>
          </View>
          <TouchableOpacity style={S.addBtn} onPress={openAdd}>
            <Text style={S.addBtnTxt}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={S.searchBox}>
          <Text style={S.searchIcon}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search name or designation..."
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

      {/* Stats row */}
      <View style={S.statsRow}>
        <View style={S.statCard}>
          <Text style={S.statLbl}>Total Staff</Text>
          <Text style={S.statVal}>{items.length}</Text>
        </View>
        <View style={[S.statCard, { borderLeftWidth: 1, borderLeftColor: T.bdrL }]}>
          <Text style={S.statLbl}>Roles</Text>
          <Text style={[S.statVal, { color: T.primary }]}>{uniqueRoles}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => (
          <View style={S.card}>
            {/* Top Row: Info */}
            <View style={S.cardTop}>
              <View style={[S.avatar, { backgroundColor: T.primaryBg }]}>
                <Text style={S.avatarTxt}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={S.infoWrap}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={S.name} numberOfLines={1}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={S.editIconBtn} onPress={() => openEdit(item)}>
                      <Text>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[S.editIconBtn, { backgroundColor: T.roseBg }]} onPress={() => handleDelete(item.id)}>
                      <Text>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={S.metaRow}>
                  <View style={[S.badge, { backgroundColor: T.bg }]}><Text style={[S.badgeTxt, { color: T.t2 }]}>📞 {item.phone}</Text></View>
                  {item.designation ? (
                    <View style={[S.badge, { backgroundColor: T.emeraldBg }]}><Text style={[S.badgeTxt, { color: T.emerald }]}>{item.designation}</Text></View>
                  ) : null}
                </View>
                {item.salary ? <Text style={S.salary}>₹{item.salary?.toLocaleString()} / month</Text> : null}
              </View>
            </View>

            {/* Divider */}
            <View style={S.cardDivider} />

            {/* Bottom Row: Actions */}
            <View style={S.cardBot}>
              <TouchableOpacity style={S.actionBtn} onPress={() => { setAttTarget(item); setAttStatus('PRESENT'); }}>
                <Text style={S.actionBtnTxt}>📋 Atten.</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: T.primaryBg }]} onPress={() => openLedger(item)}>
                <Text style={[S.actionBtnTxt, { color: T.primary }]}>📒 Ledger</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: T.purpleBg }]} onPress={() => openPermissions(item)}>
                <Text style={[S.actionBtnTxt, { color: T.purple }]}>🔐 Perms</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add/Edit Employee Modal */}
      <UiModal visible={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Employee' : 'Add Employee'}>
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
        <Input label="Name" value={form.name} onChangeText={v => { setForm(f => ({ ...f, name: v })); setFormError(null); }} placeholder="Full name" required />
        <Input label="Phone" value={form.phone} onChangeText={v => { setForm(f => ({ ...f, phone: v })); setFormError(null); }} placeholder="Phone number" keyboardType="phone-pad" leftIcon="📞" required />
        <Input label="Email (optional)" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Designation (optional)" value={form.designation} onChangeText={v => setForm(f => ({ ...f, designation: v }))} placeholder="e.g. Sales Manager" />
        <Input label="Salary (optional)" value={form.salary} onChangeText={v => setForm(f => ({ ...f, salary: v }))} placeholder="Monthly salary" keyboardType="numeric" leftIcon="₹" />
        <Button loading={saving} title={editTarget ? 'Update Employee' : 'Add Employee'} onPress={handleSave} fullWidth style={{ marginTop: 12, backgroundColor: T.primary }} />
      </UiModal>

      {/* Attendance Modal */}
      <UiModal visible={!!attTarget} onClose={() => setAttTarget(null)} title="Mark Attendance">
        {attTarget && (
          <>
            <Text style={S.attName}>{attTarget.name}</Text>
            <Text style={S.attDate}>Date: {new Date().toLocaleDateString('en-IN')}</Text>
            <View style={S.statusGrid}>
              {ATTENDANCE_STATUSES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[S.statusBtn, attStatus === s && S.statusBtnActive]}
                  onPress={() => setAttStatus(s)}
                >
                  <Text style={[S.statusTxt, attStatus === s && S.statusTxtActive]}>
                    {s === 'PRESENT' ? '✓' : s === 'ABSENT' ? '✗' : s === 'HALFDAY' ? '½' : '🏖'} {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title={isMarking ? 'Saving...' : 'Mark Attendance'} onPress={handleMarkAttendance} loading={isMarking} fullWidth style={{ marginTop: 16, backgroundColor: T.primary }} />
          </>
        )}
      </UiModal>

      {/* Ledger Modal (Rich UI) */}
      <Modal visible={!!ledgerEmployee} animationType="slide" onRequestClose={() => setLedgerEmployee(null)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: T.bg }}>
          <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />
          
          {/* Navy Hero Header */}
          <View style={[L.header, { paddingTop: insets.top + 14 }]}>
            <View style={L.navRow}>
              <TouchableOpacity onPress={() => setLedgerEmployee(null)} style={L.backBtn}>
                <Text style={L.backTxt}>← Back</Text>
              </TouchableOpacity>
              <Text style={L.navTitle}>Ledger</Text>
              <TouchableOpacity onPress={() => setLedgerMenu(true)} style={L.backBtn}>
                <Text style={L.backTxt}>⋮ More</Text>
              </TouchableOpacity>
            </View>

            <View style={L.partyRow}>
              <View style={[L.bigAvatar, { backgroundColor: T.primaryBg, borderColor: T.primary }]}>
                <Text style={[L.bigAvatarTxt, { color: T.primary }]}>{ledgerEmployee?.name?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={L.partyName}>{ledgerEmployee?.name}</Text>
                <View style={L.typeRow}>
                  {ledgerEmployee?.designation && (
                    <View style={L.typePillHdr}><Text style={L.typePillHdrTxt}>{ledgerEmployee.designation}</Text></View>
                  )}
                  {ledgerEmployee?.phone && (
                    <Text style={L.partyPhone}>📞 {ledgerEmployee.phone}</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Summary cards strip */}
          <View style={L.strip}>
            <View style={L.stripCard}>
              <Text style={[L.stripAmt, { color: T.emerald }]}>
                {processedLedgerData.sales.length + processedLedgerData.purchases.length}
              </Text>
              <Text style={L.stripLbl}>Invoices</Text>
            </View>
            <View style={{ width: 1, backgroundColor: T.bdr }} />
            <View style={L.stripCard}>
              <Text style={[L.stripAmt, { color: T.amber }]}>
                ₹{processedLedgerData.dues.reduce((s: number, d: any) => s + (d.amount || 0), 0).toLocaleString()}
              </Text>
              <Text style={L.stripLbl}>Dues Collected</Text>
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
          ) : !ledgerData ? (
            <View style={L.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.t1, marginBottom: 6 }}>No Transactions</Text>
              <Text style={{ fontSize: 13, color: T.t3, textAlign: 'center' }}>No ledger entries found for this employee</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              {/* Sales */}
              {processedLedgerData.sales.length > 0 && (
                <>
                  <Text style={L.sectionTitle}>💰 Sales Generated ({processedLedgerData.sales.length})</Text>
                  {processedLedgerData.sales.map((s: any, i: number) => (
                    <TouchableOpacity key={`s-${i}`} activeOpacity={0.75} onPress={() => setSelectedInvoice({ id: s.id, type: 'SALE' })} style={L.txCard}>
                      <View style={[L.txAccent, { backgroundColor: T.emerald }]} />
                      <View style={{ flex: 1 }}>
                        <View style={L.txTop}>
                          <Text style={L.txDate}>{s.date ? new Date(s.date).toLocaleDateString('en-IN') : ''}</Text>
                          <Text style={[L.txAmt, { color: T.emerald }]}>+₹{(s.finalTotal || 0).toLocaleString()}</Text>
                        </View>
                        <View style={L.txMid}>
                          <View style={[L.typeTag, { backgroundColor: T.emeraldBg }]}><Text style={[L.typeTagTxt, { color: T.emerald }]}>SALE</Text></View>
                        </View>
                        <Text style={L.txDesc} numberOfLines={2}>
                          {[s.invoiceNumber && `#${s.invoiceNumber}`, s.partyName || s.party?.name].filter(Boolean).join('  ·  ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {/* Purchases */}
              {processedLedgerData.purchases.length > 0 && (
                <>
                  <Text style={L.sectionTitle}>🛒 Purchases Generated ({processedLedgerData.purchases.length})</Text>
                  {processedLedgerData.purchases.map((p: any, i: number) => (
                    <TouchableOpacity key={`p-${i}`} activeOpacity={0.75} onPress={() => setSelectedInvoice({ id: p.id, type: 'PURCHASE' })} style={L.txCard}>
                      <View style={[L.txAccent, { backgroundColor: T.indigo }]} />
                      <View style={{ flex: 1 }}>
                        <View style={L.txTop}>
                          <Text style={L.txDate}>{p.date ? new Date(p.date).toLocaleDateString('en-IN') : ''}</Text>
                          <Text style={[L.txAmt, { color: T.indigo }]}>-₹{(p.finalTotal || 0).toLocaleString()}</Text>
                        </View>
                        <View style={L.txMid}>
                          <View style={[L.typeTag, { backgroundColor: T.indigoBg }]}><Text style={[L.typeTagTxt, { color: T.indigo }]}>PURCHASE</Text></View>
                        </View>
                        <Text style={L.txDesc} numberOfLines={2}>
                          {[p.invoiceNumber && `#${p.invoiceNumber}`, p.partyName || p.party?.name].filter(Boolean).join('  ·  ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {/* Dues */}
              {processedLedgerData.dues.length > 0 && (
                <>
                  <Text style={L.sectionTitle}>💸 Payment Dues Collected ({processedLedgerData.dues.length})</Text>
                  {processedLedgerData.dues.map((d: any, i: number) => (
                    <View key={`d-${i}`} style={L.txCard}>
                      <View style={[L.txAccent, { backgroundColor: T.amber }]} />
                      <View style={{ flex: 1 }}>
                        <View style={L.txTop}>
                          <Text style={L.txDate}>{d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-IN') : ''}</Text>
                          <Text style={[L.txAmt, { color: T.amber }]}>₹{(d.amount || 0).toLocaleString()}</Text>
                        </View>
                        <View style={L.txMid}>
                          <View style={[L.typeTag, { backgroundColor: T.amberBg }]}><Text style={[L.typeTagTxt, { color: T.amber }]}>PAYMENT RECV</Text></View>
                        </View>
                        <Text style={L.txDesc} numberOfLines={2}>
                          {d.party?.name || 'Party Payment'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
              {(processedLedgerData.sales.length === 0 && processedLedgerData.purchases.length === 0 && processedLedgerData.dues.length === 0) && (
                <View style={L.center}><Text style={S.emptyTxt}>No activity found</Text></View>
              )}
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
                    employeeId: ledgerEmployee?.id,
                    employeeName: ledgerEmployee?.name,
                    fromDate: filterFrom || undefined,
                    toDate: filterTo || undefined,
                    showNotes: ledgerShowNotes
                  });
                }}>
                  <Text style={L.menuTxt}>📄  Download PDF</Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: T.bdrL }} />
                <TouchableOpacity style={L.menuItem} onPress={() => { setLedgerMenu(false); if (ledgerEmployee) openLedger(ledgerEmployee); }}>
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

      {/* Permissions Modal */}
      <Modal visible={!!permEmployee} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPermEmployee(null)}>
        <View style={[S.modalRoot, { paddingBottom: insets.bottom }]}>
          <View style={[S.modalHeader, { paddingTop: insets.top + 12 }]}>
            <Text style={S.modalTitle}>🔐 Permissions — {permEmployee?.name}</Text>
            <TouchableOpacity style={S.closeBtn} onPress={() => setPermEmployee(null)}>
              <Text style={S.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={S.permList} showsVerticalScrollIndicator={false}>
            <Text style={S.permSubtitle}>Toggle what this employee can access</Text>
            {PERMISSION_FIELDS.map(field => (
              <View key={field.key} style={S.permItem}>
                <Text style={S.permLabel}>{field.label}</Text>
                <Switch
                  value={!!permissions[field.key]}
                  onValueChange={v => setPermissions(prev => ({ ...prev, [field.key]: v }))}
                  trackColor={{ false: '#e2e8f0', true: '#bfdbfe' }}
                  thumbColor={permissions[field.key] ? T.primary : '#94a3b8'}
                />
              </View>
            ))}
            <TouchableOpacity
              style={S.savePermBtn}
              onPress={handleSavePermissions}
              disabled={savingPerms}
            >
              {savingPerms
                ? <ActivityIndicator color="#fff" />
                : <Text style={S.savePermTxt}>Save Permissions</Text>
              }
            </TouchableOpacity>
          </ScrollView>
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
  cardTop:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { fontSize: 20, fontWeight: '800', color: T.primary },
  infoWrap:     { flex: 1 },
  name:         { fontSize: 16, fontWeight: '700', color: T.t1, marginBottom: 4 },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  salary:       { fontSize: 13, color: T.emerald, fontWeight: '600' },
  
  editIconBtn:  { width: 32, height: 32, backgroundColor: '#fef3c7', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  
  cardDivider:  { height: 1, backgroundColor: T.bdrL, marginVertical: 12 },
  cardBot:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTxt:     { fontSize: 10, fontWeight: '700' },
  
  actionBtn:    { flex: 1, paddingVertical: 8, backgroundColor: T.amberBg, borderRadius: 8, alignItems: 'center' },
  actionBtnTxt: { fontSize: 12, fontWeight: '700', color: T.amber },

  attName:      { fontSize: 18, fontWeight: '800', color: T.t1, marginBottom: 4 },
  attDate:      { fontSize: 14, color: T.t3, marginBottom: 16 },
  statusGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusBtn:    { width: '47%', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: T.bdr, alignItems: 'center' },
  statusBtnActive: { borderColor: T.primary, backgroundColor: T.primaryBg },
  statusTxt:    { fontSize: 14, fontWeight: '600', color: T.t3 },
  statusTxtActive: { color: T.primary },

  modalRoot:    { flex: 1, backgroundColor: T.bg },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.surface, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.bdr },
  modalTitle:   { fontSize: 16, fontWeight: '800', color: T.t1, flex: 1 },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  closeTxt:     { fontSize: 14, color: T.t3, fontWeight: '700' },
  centerBox:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt:     { fontSize: 15, color: T.t4 },

  formErrorBanner: { backgroundColor: T.roseBg, padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#fda4af', flexDirection: 'row', alignItems: 'center' },
  formErrorTxt:  { color: T.rose, fontWeight: '700', fontSize: 13, flex: 1 },

  permList:     { padding: 16, paddingBottom: 40 },
  permSubtitle: { fontSize: 14, color: T.t3, marginBottom: 16 },
  permItem:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, borderWidth: 1, borderColor: T.bdrL },
  permLabel:    { fontSize: 15, fontWeight: '600', color: T.t1 },
  savePermBtn:  { backgroundColor: T.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  savePermTxt:  { fontSize: 15, fontWeight: '800', color: T.surface },

  toast:        { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: T.navy, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, alignItems: 'center' },
  toastError:   { backgroundColor: T.rose },
  toastTxt:     { color: '#fff', fontSize: 14, fontWeight: '700' },
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

  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

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

  sectionTitle: { fontSize: 13, fontWeight: '800', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginTop: 8, marginLeft: 4 },

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
