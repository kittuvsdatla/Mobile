import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Alert, Modal, ScrollView, ActivityIndicator,
  Animated, SafeAreaView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchCustomers, fetchSuppliers, addParty, editParty, removeParty } from '@/store/slices/partiesSlice';
import { fetchDues } from '@/store/slices/duesSlice';
import { apiService } from '@/services/apiService';
import LinearGradient from 'react-native-linear-gradient';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal as UiModal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Party, LedgerEntry } from '@/types';
import { InvoicePreviewModal } from '@/components/modals/InvoicePreviewModal';

function fmt(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const justDate = dateStr.split('T')[0];
  const parts = justDate.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return justDate;
  }
  return dateStr;
}

const PAYMENT_MODES = ['Cash', 'UPI', 'Cheque', 'Bank Transfer'];

export default function PartiesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { customers, suppliers, isLoading } = useSelector((s: RootState) => s.parties);
  const { items: duesItems } = useSelector((s: RootState) => s.dues);

  const [tab, setTab] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Party | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', address: '', state: '', gstNumber: '' });

  // Party Ledger state
  const [ledgerParty, setLedgerParty] = useState<Party | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
  const [showLedgerMenu, setShowLedgerMenu] = useState(false);

  // Pay Due state
  const [payParty, setPayParty] = useState<Party | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState('Cash');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // Invoice Preview State
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const loadData = () => {
    dispatch(fetchCustomers());
    dispatch(fetchSuppliers());
    dispatch(fetchDues(undefined));
  };

  useEffect(() => { loadData(); }, []);

  const items = tab === 'CUSTOMER' ? customers : suppliers;
  const filtered = items.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone?.includes(search) ?? false)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', address: '', state: '', gstNumber: '' });
    setShowModal(true);
  };

  const openEdit = (party: Party) => {
    setEditTarget(party);
    setForm({ name: party.name, phone: party.phone || '', address: party.address || '', state: party.state || '', gstNumber: party.gstNumber || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { return; }
    if (editTarget) {
      await dispatch(editParty({ id: editTarget.id, data: { name: form.name, phone: form.phone, address: form.address, state: form.state, gstNumber: form.gstNumber } }));
    } else {
      await dispatch(addParty({ ...form, type: tab }));
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Party', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeParty(id)) },
    ]);
  };

  const openLedger = async (party: Party) => {
    setLedgerParty(party);
    setLedgerLoading(true);
    setLedgerCurrentPage(1);
    setShowLedgerMenu(false);
    try {
      const res = await apiService.getPartyLedger(party.id);
      setLedgerEntries(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLedgerEntries([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const openPayDue = (party: Party) => {
    setPayParty(party);
    setPayAmount('');
    setPayMode('Cash');
    setPayNotes('');
    setPayDate(new Date().toISOString().split('T')[0]);
  };

  const handlePayDue = async () => {
    if (!payParty || !payAmount || Number(payAmount) <= 0) { return; }
    setPaying(true);
    try {
      await apiService.recordPartyPayment({
        partyId: payParty.id,
        amount: Number(payAmount),
        paymentMode: payMode.toLowerCase(),
        notes: payNotes || undefined,
        date: payDate,
      });
      Alert.alert('✓ Payment Recorded', `₹${Number(payAmount).toLocaleString()} recorded for ${payParty.name}`);
      setPayParty(null);
      dispatch(fetchDues(undefined));
    } catch {
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  // Compute total due per party from dues store
  const getDueForParty = (partyId: string) => {
    return duesItems
      .filter(d => (d.party?.id === partyId || d.partyId === partyId) && d.status !== 'cleared')
      .reduce((sum, d) => sum + (d.balanceAmount ?? d.balance ?? 0), 0);
  };

  // Process ledger entries with running balance
  const processLedgerEntries = () => {
    const sortedChronological = [...ledgerEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    let running = 0;
    const mapped = sortedChronological.map(tx => {
      let given = 0;
      let credit = 0;
      let impact = 0;

      if (tx.type === 'SALE' || tx.type === 'PURCHASE') {
        given = Number(tx.amountPaid) || 0;
        credit = Number(tx.dueAmount) || 0;
        impact = credit;
      } else if (tx.type === 'PAYMENT_RECEIVED' || tx.type === 'PAYMENT_GIVEN') {
        given = Number(tx.amount) || 0;
        credit = 0;
        impact = -given;
      }

      running += impact;
      return { ...tx, given, credit, runningBalance: running };
    });

    return [...mapped].reverse();
  };

  const finalLedger = processLedgerEntries();
  const totalLedgerDebits = finalLedger.reduce((sum, item) => sum + item.given, 0);
  const totalLedgerCredits = finalLedger.reduce((sum, item) => sum + item.credit, 0);
  const ledgerOutstandingBalance = finalLedger.length > 0 ? finalLedger[0].runningBalance : 0;

  // Pagination for Ledger modal
  const ledgerItemsPerPage = 15;
  const ledgerTotalPages = Math.max(1, Math.ceil(finalLedger.length / ledgerItemsPerPage));
  const ledgerStartIndex = (ledgerCurrentPage - 1) * ledgerItemsPerPage;
  const paginatedLedger = finalLedger.slice(ledgerStartIndex, ledgerStartIndex + ledgerItemsPerPage);

  if (isLoading && !customers.length && !suppliers.length) {
    return <LoadingSpinner message="Loading parties..." />;
  }

  return (
    <View style={styles.screen}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['CUSTOMER', 'SUPPLIER'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'CUSTOMER' ? `👥 Customers (${customers.length})` : `🚚 Suppliers (${suppliers.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search + Add */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${tab === 'CUSTOMER' ? 'customers' : 'suppliers'}...`}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
        ListEmptyComponent={<EmptyState icon={tab === 'CUSTOMER' ? '👥' : '🚚'} title={`No ${tab === 'CUSTOMER' ? 'customers' : 'suppliers'} yet`} subtitle="Tap + Add to get started" />}
        renderItem={({ item }) => {
          const totalDue = getDueForParty(item.id);
          return (
            <View style={styles.card}>
              {/* Party Info */}
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {item.phone ? <Text style={styles.cardPhone}>📞 {item.phone}</Text> : null}
                  {item.address ? <Text style={styles.cardAddr} numberOfLines={1}>📍 {item.address}</Text> : null}
                  {item.gstNumber ? <Text style={styles.cardGst}>GST: {item.gstNumber}</Text> : null}
                  {totalDue > 0 ? (
                    <View style={styles.dueBadge}>
                      <Text style={styles.dueTxt}>
                        {tab === 'CUSTOMER' ? '💰 To Receive:' : '💸 To Pay:'} {fmt(totalDue)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.clearedBadge}>
                      <Text style={styles.clearedTxt}>✓ No Dues</Text>
                    </View>
                  )}
                </View>
                {/* Edit & Delete */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.iconTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#fee2e2' }]} onPress={() => handleDelete(item.id)}>
                    <Text style={styles.iconTxt}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.ledgerBtn} onPress={() => openLedger(item)}>
                  <Text style={styles.ledgerTxt}>📋 Ledger</Text>
                </TouchableOpacity>
                {totalDue > 0 && (
                  <Animated.View style={{ flex: 1, opacity: pulseAnim }}>
                    <TouchableOpacity onPress={() => openPayDue(item)}>
                      <LinearGradient
                        colors={['#f97316', '#ef4444']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.payBtnGradient}
                      >
                        <Text style={styles.payTxtGradient}>
                          {tab === 'CUSTOMER' ? '💰 Receive' : '💸 Pay Due'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            </View>
          );
        }}
      />

      <UiModal visible={showModal} onClose={() => setShowModal(false)} title={editTarget ? `Edit ${tab === 'CUSTOMER' ? 'Customer' : 'Supplier'}` : `Add ${tab === 'CUSTOMER' ? 'Customer' : 'Supplier'}`}>
        <Input label="Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Full name" required />
        <Input label="Phone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="Phone number" keyboardType="phone-pad" leftIcon="📞" />
        <Input label="Address" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} placeholder="Full address" multiline />
        <Input label="State" value={form.state} onChangeText={v => setForm(f => ({ ...f, state: v }))} placeholder="State name" />
        <Input label="GST Number" value={form.gstNumber} onChangeText={v => setForm(f => ({ ...f, gstNumber: v }))} placeholder="Optional" autoCapitalize="characters" />
        <Button title={editTarget ? 'Update' : 'Add'} onPress={handleSave} fullWidth style={{ marginTop: 8 }} />
      </UiModal>

      {/* Ledger Modal */}
      <Modal
        visible={!!ledgerParty}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        animationType="slide"
        onRequestClose={() => setLedgerParty(null)}
      >
        <SafeAreaView style={styles.container}>
          {/* Header with blue/indigo gradient */}
          <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.header}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => setLedgerParty(null)} style={styles.backButton}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Party Ledger & Statement</Text>
              <TouchableOpacity onPress={() => setShowLedgerMenu(true)} style={styles.menuButton}>
                <Text style={styles.menuIcon}>⋮</Text>
              </TouchableOpacity>
            </View>

            {/* Card info inside gradient header */}
            <View style={styles.headerDetails}>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountLabel}>{ledgerParty?.type || 'Party'}</Text>
                <Text style={styles.accountName} numberOfLines={1}>
                  {ledgerParty?.name}
                </Text>
              </View>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Outstanding Balance</Text>
                <Text style={styles.balanceValue}>
                  {fmt(ledgerOutstandingBalance)}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Quick Summary Section */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Given / Paid (-)</Text>
              <Text style={[styles.summaryVal, { color: '#22c55e' }]}>{fmt(totalLedgerDebits)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Credit / Due (+)</Text>
              <Text style={[styles.summaryVal, { color: '#f97316' }]}>{fmt(totalLedgerCredits)}</Text>
            </View>
          </View>

          {/* Date Period Subtitle */}
          <View style={styles.periodRow}>
            <Text style={styles.periodText}>
              Party Statement Log
            </Text>
            <Text style={styles.countText}>{finalLedger.length} Transactions</Text>
          </View>

          {/* Transaction List */}
          {ledgerLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#1e3a8a" />
              <Text style={styles.loadingText}>Loading ledger transactions...</Text>
            </View>
          ) : paginatedLedger.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found for this party.</Text>
            </View>
          ) : (
            <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
              {paginatedLedger.map((entry: any, idx) => {
                const hasGiven = entry.given > 0;
                const hasCredit = entry.credit > 0;
                
                return (
                  <View key={idx} style={styles.txRow}>
                    <View style={styles.txMainInfo}>
                      <View style={styles.txHeaderLine}>
                        {/* Date */}
                        <Text style={styles.txDate}>{formatDate(entry.date)}</Text>
                        {/* Given or Credit Amount */}
                        {hasGiven ? (
                          <Text style={[styles.txAmount, styles.creditText]}>
                            + {fmt(entry.given)}
                          </Text>
                        ) : hasCredit ? (
                          <Text style={[styles.txAmount, { color: '#f97316' }]}>
                            - {fmt(entry.credit)}
                          </Text>
                        ) : (
                          <Text style={[styles.txAmount, { color: '#64748b' }]}>₹0.00</Text>
                        )}
                      </View>

                      {/* Transaction Type Dynamic Badge */}
                      <View style={styles.txDetailsLine}>
                        <View style={styles.typeBadgeContainer}>
                          <Text style={[
                            styles.typeBadge,
                            entry.type?.toLowerCase()?.includes('sale') && styles.badgeSale,
                            entry.type?.toLowerCase()?.includes('purc') && styles.badgePurchase,
                            entry.type?.toLowerCase()?.includes('pay') && styles.badgePayment,
                          ]}>
                            {entry.type}
                          </Text>
                          {entry.reference ? (
                            (entry.type === 'SALE' || entry.type === 'PURCHASE') ? (
                              <TouchableOpacity
                                onPress={() => {
                                  setPreviewInvoice(entry);
                                  setShowPreviewModal(true);
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.invoiceNo, styles.invoiceLink]}>
                                  {entry.reference?.split('-')?.slice(0, 2)?.join('-')}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={styles.invoiceNo}>
                                {entry.reference?.split('-')?.slice(0, 2)?.join('-')}
                              </Text>
                            )
                          ) : null}
                        </View>
                        <Text style={styles.txBalance}>
                          Balance: {fmt(entry.runningBalance)}
                        </Text>
                      </View>

                      {/* Particulars / Description */}
                      <Text style={styles.particulars}>{entry.description || entry.notes || 'No description'}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Pagination Controls */}
              {ledgerTotalPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    disabled={ledgerCurrentPage === 1}
                    onPress={() => setLedgerCurrentPage(prev => Math.max(1, prev - 1))}
                    style={[styles.pageBtn, ledgerCurrentPage === 1 && styles.pageBtnDisabled]}
                  >
                    <Text style={styles.pageBtnText}>◀ Prev</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.pageIndicator}>
                    Page {ledgerCurrentPage} of {ledgerTotalPages}
                  </Text>
                  
                  <TouchableOpacity
                    disabled={ledgerCurrentPage === ledgerTotalPages}
                    onPress={() => setLedgerCurrentPage(prev => Math.min(ledgerTotalPages, prev + 1))}
                    style={[styles.pageBtn, ledgerCurrentPage === ledgerTotalPages && styles.pageBtnDisabled]}
                  >
                    <Text style={styles.pageBtnText}>Next ▶</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {/* Context/Actions Menu Modal */}
          <Modal
            visible={showLedgerMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLedgerMenu(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowLedgerMenu(false)}
            >
              <View style={styles.menuDropdown}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowLedgerMenu(false);
                    apiService.openLedgerPdf(undefined, undefined, ledgerParty?.id, undefined);
                  }} 
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemText}>📄 Download PDF</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity 
                  onPress={() => {
                    setShowLedgerMenu(false);
                    if (ledgerParty) openLedger(ledgerParty);
                  }} 
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemText}>🔄 Refresh Data</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity onPress={() => setShowLedgerMenu(false)} style={styles.menuItem}>
                  <Text style={[styles.menuItemText, { color: '#ef4444' }]}>❌ Close Menu</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </SafeAreaView>
      </Modal>

      {/* Pay Due Modal */}
      <Modal visible={!!payParty} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="slide" transparent onRequestClose={() => setPayParty(null)}>
        <TouchableOpacity style={styles.payOverlay} activeOpacity={1} onPress={() => setPayParty(null)}>
          <View style={[styles.paySheet, { paddingBottom: insets.bottom + 24 }]} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {tab === 'CUSTOMER' ? '💰 Receive Due' : '💸 Pay Due'} — {payParty?.name}
            </Text>
            <Text style={styles.paySubtitle}>
              Outstanding: {fmt(getDueForParty(payParty?.id || ''))}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>Amount (₹) *</Text>
              <TouchableOpacity onPress={() => setPayAmount(getDueForParty(payParty?.id || '').toString())}>
                <Text style={{ fontSize: 12, color: '#f16a0a', fontWeight: '700' }}>Pay Full Amount</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.payInput}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
            />

            <Text style={styles.payLabel}>Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.payInput}
              value={payDate}
              onChangeText={setPayDate}
              placeholder="YYYY-MM-DD"
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPayParty(null)}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handlePayDue} disabled={paying}>
                {paying
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.confirmTxt}>Confirm Payment</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        visible={showPreviewModal}
        invoice={previewInvoice}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewInvoice(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#f16a0a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#f16a0a' },
  searchRow: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' },
  addBtn: { backgroundColor: '#f16a0a', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12, paddingBottom: 32 },

  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#1d4ed8' },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardPhone: { fontSize: 13, color: '#6b7280' },
  cardAddr: { fontSize: 12, color: '#9ca3af' },
  cardGst: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },
  dueBadge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  dueTxt: { fontSize: 12, fontWeight: '700', color: '#d97706' },
  clearedBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  clearedTxt: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
  cardActions: { gap: 6 },
  iconBtn: { width: 36, height: 36, backgroundColor: '#fef3c7', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 16 },

  actionRow: { flexDirection: 'row', gap: 8 },
  ledgerBtn: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  ledgerTxt: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  payBtn: { flex: 1, backgroundColor: '#dcfce7', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  payTxt: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  payBtnGradient: { borderRadius: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  payTxtGradient: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Ledger modal
  modalRoot: { flex: 1, backgroundColor: '#f9fafb' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingTop: 52 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTxt: { fontSize: 15, color: '#9ca3af' },
  ledgerList: { padding: 16, paddingBottom: 32 },
  ledgerCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
  ledgerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  ledgerType: { fontSize: 14, fontWeight: '700', color: '#111827', textTransform: 'capitalize' },
  ledgerAmt: { fontSize: 15, fontWeight: '800' },
  ledgerBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  ledgerDate: { fontSize: 12, color: '#9ca3af' },
  ledgerNote: { fontSize: 12, color: '#6b7280', flex: 1, textAlign: 'right' },

  // Pay Due modal
  payOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  paySheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  paySubtitle: { fontSize: 14, color: '#ef4444', fontWeight: '600', marginBottom: 16, marginTop: 4 },
  payLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  payInput: { backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  modeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  modeChipActive: { borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  modeChipTxt: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeChipTxtActive: { color: '#f16a0a' },
  payActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  confirmBtn: { flex: 2, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  confirmTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // Shared Statement screen-style styles
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: Platform.OS === 'ios' ? 10 : 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8 },
  backIcon: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  headerTitle: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  menuButton: { padding: 8 },
  menuIcon: { color: '#ffffff', fontSize: 24, fontWeight: 'bold' },
  headerDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  accountName: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginTop: 4, maxWidth: 160 },
  balanceContainer: { alignItems: 'flex-end' },
  balanceLabel: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  summaryBar: { flexDirection: 'row', backgroundColor: '#ffffff', marginHorizontal: 16, borderRadius: 16, paddingVertical: 14, marginTop: -15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, zIndex: 10 },
  summaryItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  summaryVal: { fontSize: 15, fontWeight: '700' },
  divider: { width: 1, backgroundColor: '#e2e8f0' },
  periodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  periodText: { fontSize: 12, color: '#64748b' },
  countText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#64748b', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyText: { color: '#64748b', fontSize: 15, textAlign: 'center' },
  txRow: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3 },
  txMainInfo: { flex: 1 },
  txHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  txDate: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  txAmount: { fontSize: 15, fontWeight: '800' },
  creditText: { color: '#22c55e' },
  txDetailsLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadgeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { fontSize: 10, fontWeight: '700', color: '#1e3a8a', backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
  badgeSale: { color: '#15803d', backgroundColor: '#f0fdf4' },
  badgePurchase: { color: '#b45309', backgroundColor: '#fffbeb' },
  badgePayment: { color: '#4f46e5', backgroundColor: '#e0e7ff' },
  invoiceNo: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  invoiceLink: { color: '#1d4ed8', textDecorationLine: 'underline' },
  txBalance: { fontSize: 12, color: '#475569', fontWeight: '600' },
  particulars: { fontSize: 13, color: '#475569', lineHeight: 18, marginTop: 2 },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingVertical: 10 },
  pageBtn: { backgroundColor: '#ffffff', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  pageIndicator: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-start', alignItems: 'flex-end' },
  menuDropdown: { backgroundColor: '#ffffff', borderRadius: 12, marginTop: Platform.OS === 'ios' ? 90 : 60, marginRight: 16, padding: 4, width: 170, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  menuItemText: { fontSize: 14, color: '#334155', fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: '#f1f5f9' },
});
