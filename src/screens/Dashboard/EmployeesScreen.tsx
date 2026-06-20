import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal, ScrollView, ActivityIndicator, Switch,
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
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal as UiModal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Employee, EmployeePermissions } from '@/types';

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

  const [refreshing, setRefreshing] = useState(false);

  // Add/Edit Employee Modal
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', designation: '', salary: '',
  });

  // Attendance Modal
  const [attTarget, setAttTarget] = useState<Employee | null>(null);
  const [attStatus, setAttStatus] = useState<typeof ATTENDANCE_STATUSES[number]>('PRESENT');
  const [isMarking, setIsMarking] = useState(false);

  // Ledger Modal
  const [ledgerEmployee, setLedgerEmployee] = useState<Employee | null>(null);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Permissions Modal
  const [permEmployee, setPermEmployee] = useState<Employee | null>(null);
  const [permissions, setPermissions] = useState<EmployeePermissions>(DEFAULT_PERMISSIONS);
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => { dispatch(fetchEmployees()); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchEmployees());
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', email: '', designation: '', salary: '' });
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditTarget(emp);
    setForm({
      name: emp.name, phone: emp.phone,
      email: emp.email || '', designation: emp.designation || '',
      salary: emp.salary ? String(emp.salary) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) { return; }
    const data = {
      name: form.name, phone: form.phone,
      email: form.email || undefined,
      designation: form.designation || undefined,
      salary: form.salary ? Number(form.salary) : undefined,
    };
    if (editTarget) {
      await dispatch(editEmployee({ id: editTarget.id, data }));
    } else {
      await dispatch(addEmployee(data));
    }
    setShowModal(false);
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
      Alert.alert('✓ Attendance Marked', `${attTarget.name}: ${attStatus}`);
    } catch {
      Alert.alert('Error', 'Failed to mark attendance');
    } finally {
      setIsMarking(false);
    }
  };

  const openLedger = async (emp: Employee) => {
    setLedgerEmployee(emp);
    setLedgerLoading(true);
    try {
      const res = await apiService.getEmployeeLedger(emp.id);
      setLedgerData(res);
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
      Alert.alert('✓ Permissions Updated', `${permEmployee.name}'s permissions have been saved.`);
      setPermEmployee(null);
    } catch {
      Alert.alert('Error', 'Failed to update permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  if (isLoading && !items.length) { return <LoadingSpinner message="Loading employees..." />; }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.count}>{items.length} Employees</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
        ListEmptyComponent={<EmptyState icon="👷" title="No employees yet" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.phone}>📞 {item.phone}</Text>
                {item.designation ? <Text style={styles.desig}>{item.designation}</Text> : null}
                {item.salary ? <Text style={styles.salary}>₹{item.salary?.toLocaleString()} / month</Text> : null}
              </View>
              {/* Edit & Delete */}
              <View style={styles.topActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                  <Text style={styles.iconTxt}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#fee2e2' }]} onPress={() => handleDelete(item.id)}>
                  <Text style={styles.iconTxt}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Action Row */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.attBtn} onPress={() => { setAttTarget(item); setAttStatus('PRESENT'); }}>
                <Text style={styles.attTxt}>📋 Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ledgerBtn} onPress={() => openLedger(item)}>
                <Text style={styles.ledgerTxt}>📒 Ledger</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.permBtn} onPress={() => openPermissions(item)}>
                <Text style={styles.permTxt}>🔐 Perms</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add/Edit Employee Modal */}
      <UiModal visible={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Employee' : 'Add Employee'}>
        <Input label="Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Full name" required />
        <Input label="Phone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="Phone number" keyboardType="phone-pad" leftIcon="📞" required />
        <Input label="Email (optional)" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Designation (optional)" value={form.designation} onChangeText={v => setForm(f => ({ ...f, designation: v }))} placeholder="e.g. Sales Manager" />
        <Input label="Salary (optional)" value={form.salary} onChangeText={v => setForm(f => ({ ...f, salary: v }))} placeholder="Monthly salary" keyboardType="numeric" leftIcon="₹" />
        <Button title={editTarget ? 'Update Employee' : 'Add Employee'} onPress={handleSave} fullWidth style={{ marginTop: 8 }} />
      </UiModal>

      {/* Attendance Modal */}
      <UiModal visible={!!attTarget} onClose={() => setAttTarget(null)} title="Mark Attendance">
        {attTarget && (
          <>
            <Text style={styles.attName}>{attTarget.name}</Text>
            <Text style={styles.attDate}>Date: {new Date().toLocaleDateString('en-IN')}</Text>
            <View style={styles.statusGrid}>
              {ATTENDANCE_STATUSES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, attStatus === s && styles.statusBtnActive]}
                  onPress={() => setAttStatus(s)}
                >
                  <Text style={[styles.statusTxt, attStatus === s && styles.statusTxtActive]}>
                    {s === 'PRESENT' ? '✓' : s === 'ABSENT' ? '✗' : s === 'HALFDAY' ? '½' : '🏖'} {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title={isMarking ? 'Saving...' : 'Mark Attendance'} onPress={handleMarkAttendance} loading={isMarking} fullWidth style={{ marginTop: 12 }} />
          </>
        )}
      </UiModal>

      {/* Ledger Modal */}

      <Modal visible={!!ledgerEmployee} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLedgerEmployee(null)}>        <View style={[styles.modalRoot, { paddingBottom: insets.bottom }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.modalTitle}>📒 Ledger — {ledgerEmployee?.name}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setLedgerEmployee(null)}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        {ledgerLoading ? (
          <View style={styles.centerBox}><ActivityIndicator color="#f16a0a" size="large" /></View>
        ) : !ledgerData ? (
          <View style={styles.centerBox}><Text style={styles.emptyTxt}>No ledger data found</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.ledgerList} showsVerticalScrollIndicator={false}>
            {/* Sales */}
            {(ledgerData.sales || []).length > 0 && (
              <>
                <Text style={styles.ledgerSection}>💰 Sales ({(ledgerData.sales || []).length})</Text>
                {(ledgerData.sales || []).map((s: any, i: number) => (
                  <View key={i} style={styles.ledgerCard}>
                    <View style={styles.ledgerRow}>
                      <Text style={styles.ledgerLabel}>{s.invoiceNumber}</Text>
                      <Text style={[styles.ledgerAmt, { color: '#22c55e' }]}>+₹{(s.finalTotal || 0).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.ledgerDate}>{s.date ? new Date(s.date).toLocaleDateString('en-IN') : ''}</Text>
                  </View>
                ))}
              </>
            )}
            {/* Purchases */}
            {(ledgerData.purchases || []).length > 0 && (
              <>
                <Text style={styles.ledgerSection}>🛒 Purchases ({(ledgerData.purchases || []).length})</Text>
                {(ledgerData.purchases || []).map((p: any, i: number) => (
                  <View key={i} style={styles.ledgerCard}>
                    <View style={styles.ledgerRow}>
                      <Text style={styles.ledgerLabel}>{p.invoiceNumber}</Text>
                      <Text style={[styles.ledgerAmt, { color: '#ef4444' }]}>-₹{(p.finalTotal || 0).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.ledgerDate}>{p.date ? new Date(p.date).toLocaleDateString('en-IN') : ''}</Text>
                  </View>
                ))}
              </>
            )}
            {(ledgerData.sales || []).length === 0 && (ledgerData.purchases || []).length === 0 && (
              <View style={styles.centerBox}><Text style={styles.emptyTxt}>No transactions found</Text></View>
            )}
          </ScrollView>
        )}
      </View>
      </Modal>

      {/* Permissions Modal */}

      <Modal visible={!!ledgerEmployee} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLedgerEmployee(null)}>        <View style={[styles.modalRoot, { paddingBottom: insets.bottom }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.modalTitle}>🔐 Permissions — {permEmployee?.name}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setPermEmployee(null)}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.permList} showsVerticalScrollIndicator={false}>
          <Text style={styles.permSubtitle}>Toggle what this employee can access</Text>
          {PERMISSION_FIELDS.map(field => (
            <View key={field.key} style={styles.permItem}>
              <Text style={styles.permLabel}>{field.label}</Text>
              <Switch
                value={!!permissions[field.key]}
                onValueChange={v => setPermissions(prev => ({ ...prev, [field.key]: v }))}
                trackColor={{ false: '#e5e7eb', true: '#fed7aa' }}
                thumbColor={permissions[field.key] ? '#f16a0a' : '#9ca3af'}
              />
            </View>
          ))}
          <TouchableOpacity
            style={styles.savePermBtn}
            onPress={handleSavePermissions}
            disabled={savingPerms}
          >
            {savingPerms
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.savePermTxt}>Save Permissions</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  count: { fontSize: 15, fontWeight: '700', color: '#374151' },
  addBtn: { backgroundColor: '#f16a0a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  addText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12, paddingBottom: 32 },

  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#1d4ed8' },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  phone: { fontSize: 13, color: '#6b7280' },
  desig: { fontSize: 12, color: '#9ca3af' },
  salary: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  topActions: { gap: 6 },
  iconBtn: { width: 36, height: 36, backgroundColor: '#fef3c7', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 16 },

  actionRow: { flexDirection: 'row', gap: 8 },
  attBtn: { flex: 1, backgroundColor: '#fef3c7', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  attTxt: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  ledgerBtn: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  ledgerTxt: { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  permBtn: { flex: 1, backgroundColor: '#f5f3ff', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  permTxt: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },

  attName: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  attDate: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusBtn: { width: '47%', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  statusBtnActive: { borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  statusTxt: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  statusTxtActive: { color: '#f16a0a' },

  modalRoot: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingTop: 52 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt: { fontSize: 15, color: '#9ca3af' },

  ledgerList: { padding: 16, paddingBottom: 32 },
  ledgerSection: { fontSize: 14, fontWeight: '800', color: '#374151', marginTop: 12, marginBottom: 8 },
  ledgerCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  ledgerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ledgerLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  ledgerAmt: { fontSize: 15, fontWeight: '800' },
  ledgerDate: { fontSize: 12, color: '#9ca3af', marginTop: 3 },

  permList: { padding: 16, paddingBottom: 40 },
  permSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  permItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  permLabel: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  savePermBtn: { backgroundColor: '#f16a0a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  savePermTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
