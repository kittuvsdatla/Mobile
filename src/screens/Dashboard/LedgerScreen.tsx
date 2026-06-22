import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  BackHandler,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import LinearGradient from 'react-native-linear-gradient';
import type { RootState } from '@/store';
import type { DashboardDrawerParamList, LedgerEntry } from '@/types';
import { apiService } from '@/services/apiService';
import { downloadLedgerPdf } from '@/services/downloadHelper';
import { Card } from '@/components/ui/Card';
import { InvoicePreviewModal } from '@/components/modals/InvoicePreviewModal';
import { Alert } from 'react-native';

type LedgerRouteProp = RouteProp<DashboardDrawerParamList, 'Ledger'>;
type LedgerNavigationProp = DrawerNavigationProp<DashboardDrawerParamList>;

const ITEMS_PER_PAGE = 15;

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

function fmtCurrency(amount: number): string {
  return '₹' + (amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

export default function LedgerScreen() {
  const insets  = useSafeAreaInsets();
  const route = useRoute<LedgerRouteProp>();
  const navigation = useNavigation<LedgerNavigationProp>();
  const { fromDate, toDate, partyId, types } = route.params;

  const { customers, suppliers } = useSelector((s: RootState) => s.parties);
  const allParties = [...customers, ...suppliers];
  const selectedParty = allParties.find(p => p.id === partyId);
  const partyName = selectedParty ? selectedParty.name : 'All Parties';

  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Invoice Preview State
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  const handleOpenInvoicePreview = async (entry: any) => {
    if (!entry.referenceId) {
      Alert.alert('Not Available', 'Reference ID not found for this transaction.');
      return;
    }
    setLoadingInvoice(true);
    try {
      const isSale = entry.type.toLowerCase().includes('sale');
      const res = isSale
        ? await apiService.getSaleDetail(entry.referenceId)
        : await apiService.getPurchaseDetail(entry.referenceId);
      
      if (res.success && res.data) {
        const raw = res.data as any;
        const mappedInvoice = {
          id:              raw.id,
          invoiceNumber:   raw.invoiceNumber,
          reference:       raw.invoiceNumber,
          type:            isSale ? 'SALE' : 'PURCHASE',
          date:            raw.date,
          partyName:       raw.partyName || raw.party?.name,
          partyPhone:      raw.partyPhone || raw.party?.phone,
          finalTotal:      raw.finalTotal,
          amount:          raw.finalTotal,
          subTotal:        raw.subtotal ?? raw.taxableSubtotal,
          taxableSubtotal: raw.taxableSubtotal,
          subtotal:        raw.subtotal,
          cgstAmount:      raw.cgstAmount ?? 0,
          sgstAmount:      raw.sgstAmount ?? 0,
          taxAmount:       (raw.cgstAmount ?? 0) + (raw.sgstAmount ?? 0),
          discount:        raw.discount ?? 0,
          amountPaid:      raw.amountPaid,
          dueAmount:       raw.dueAmount,
          transporterName: raw.transporterName,
          vehicleNumber:   raw.vehicleNumber,
          deliveryLocation:raw.deliveryLocation,
          freightCharge:   raw.transportCharges ?? raw.freightCharge,
          transportCharges:raw.transportCharges,
          paymentMode:     raw.paymentMode,
          paymentType:     raw.paymentType,
          notes:           raw.notes,
          items: (raw.items ?? []).map((it: any) => ({
            productName:   it.productName  || it.name || '—',
            quantity:      it.quantity     ?? 0,
            unitType:      it.unitType     || '',
            rate:          it.rate         ?? it.finalRate ?? 0,
            total:         it.total        ?? 0,
            hsnCode:       it.hsnCode,
            gstPercentage: it.gstPercentage,
            taxableAmount: it.taxableAmount,
            gstAmount:     it.gstAmount,
          })),
        };
        setPreviewInvoice(mappedInvoice);
        setShowPreviewModal(true);
      } else {
        Alert.alert('Error', 'Failed to retrieve invoice details.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An error occurred while loading preview.');
    } finally {
      setLoadingInvoice(false);
    }
  };


  // Fetch unified ledger
  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getUnifiedLedger(fromDate, toDate, partyId, types);
      
      // Sort: New to Old (Newest first).
      // We compare timestamp if available, else date.
      const sorted = [...data].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.date).getTime();
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.date).getTime();
        return timeB - timeA;
      });

      setLedgerData(sorted);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching ledger details', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, partyId, types]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  useEffect(() => {
    const backAction = () => {
      navigation.navigate('Reports');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation]);

  const handleDownloadPdf = () => {
    setShowMenu(false);
    downloadLedgerPdf({
      partyId,
      partyName,
      fromDate,
      toDate,
      types,
      showNotes,
    });
  };

  const handleRefresh = () => {
    setShowMenu(false);
    fetchLedger();
  };

  // Calculations
  const totalDebits = ledgerData.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredits = ledgerData.reduce((sum, item) => sum + (item.credit || 0), 0);
  
  // Outstanding/Running balance (latest transaction's balance if any, otherwise difference)
  const latestBalance = ledgerData.length > 0 ? ledgerData[0].balance : 0;
  const latestBalanceType = ledgerData.length > 0 ? ledgerData[0].balanceType : 'Dr';

  // Pagination
  const totalPages = Math.max(1, Math.ceil(ledgerData.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = ledgerData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      {/* Header with navy gradient matching ReportsScreen */}
      <LinearGradient
        colors={['#0f172a', '#1e293b']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.navigate('Reports')} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Statement</Text>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton}>
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Card info inside gradient header */}
        <View style={styles.headerDetails}>
          <View>
            <Text style={styles.accountLabel}>Party Ledger</Text>
            <Text style={styles.accountName} numberOfLines={1}>
              {partyName}
            </Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>
              {fmtCurrency(latestBalance)} <Text style={styles.balanceType}>{latestBalanceType}</Text>
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Summary Section */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Debits (-)</Text>
          <Text style={[styles.summaryVal, { color: '#ef4444' }]}>{fmtCurrency(totalDebits)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Credits (+)</Text>
          <Text style={[styles.summaryVal, { color: '#22c55e' }]}>{fmtCurrency(totalCredits)}</Text>
        </View>
      </View>

      {/* Date Period Subtitle */}
      <View style={styles.periodRow}>
        <Text style={styles.periodText}>
          Period: <Text style={styles.boldText}>{formatDate(fromDate)}</Text> to <Text style={styles.boldText}>{formatDate(toDate)}</Text>
        </Text>
        <Text style={styles.countText}>{ledgerData.length} Transactions</Text>
      </View>

      {/* Transaction List */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : paginatedItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions found for this period.</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {paginatedItems.map((entry, idx) => {
            const isCredit = entry.credit > 0;
            const amount = isCredit ? entry.credit : entry.debit;
            
            return (
              <View key={idx} style={styles.txRow}>
                <View style={styles.txMainInfo}>
                  <View style={styles.txHeaderLine}>
                    {/* Date */}
                    <Text style={styles.txDate}>{formatDate(entry.date)}</Text>
                    {/* Credit or Debit Amount */}
                    <Text style={[styles.txAmount, isCredit ? styles.creditText : styles.debitText]}>
                      {isCredit ? '+' : '-'} {fmtCurrency(amount)}
                    </Text>
                  </View>

                  {/* Transaction Type Dynamic Badge */}
                  <View style={styles.txDetailsLine}>
                    <View style={styles.typeBadgeContainer}>
                      <Text style={[
                        styles.typeBadge,
                        entry.type.toLowerCase().includes('sale') && styles.badgeSale,
                        entry.type.toLowerCase().includes('purc') && styles.badgePurchase,
                        entry.type.toLowerCase().includes('pay') && styles.badgePayment,
                      ]}>
                        {entry.type}
                      </Text>
                      {entry.voucherNo ? (
                        (entry.type.toLowerCase().includes('sale') || entry.type.toLowerCase().includes('purc')) ? (
                          <TouchableOpacity
                            onPress={() => handleOpenInvoicePreview(entry)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.invoiceNo, styles.invoiceLink]}>
                              {entry.voucherNo}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.invoiceNo}>{entry.voucherNo}</Text>
                        )
                      ) : null}
                    </View>
                    <Text style={styles.txBalance}>
                      Balance: {fmtCurrency(entry.balance)} <Text style={styles.balanceTypeSmall}>{entry.balanceType}</Text>
                    </Text>
                  </View>

                  {/* Particulars */}
                  <Text style={styles.particulars}>{entry.particulars}</Text>
                </View>
              </View>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>◀ Prev</Text>
              </TouchableOpacity>
              
              <Text style={styles.pageIndicator}>
                Page {currentPage} of {totalPages}
              </Text>
              
              <TouchableOpacity
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>Next ▶</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Context/Actions Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuDropdown}>
            {/* Include Notes toggle */}
            <TouchableOpacity
              style={[styles.menuItem, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
              onPress={() => setShowNotes(n => !n)}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 5, borderWidth: 2,
                borderColor: showNotes ? '#10b981' : '#cbd5e1',
                backgroundColor: showNotes ? '#10b981' : '#fff',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {showNotes && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>✓</Text>}
              </View>
              <Text style={styles.menuItemText}>Notes</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity onPress={handleDownloadPdf} style={styles.menuItem}>
              <Text style={styles.menuItemText}>📄 Download PDF</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity onPress={handleRefresh} style={styles.menuItem}>
              <Text style={styles.menuItemText}>🔄 Refresh Data</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity onPress={() => setShowMenu(false)} style={styles.menuItem}>
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>❌ Close Menu</Text>
            </TouchableOpacity>
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

      {loadingInvoice && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.3)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={{ marginTop: 10, color: '#fff', fontWeight: '700' }}>Fetching invoice details...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  accountName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 160,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  balanceType: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: -15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  periodText: {
    fontSize: 12,
    color: '#64748b',
  },
  boldText: {
    fontWeight: '700',
    color: '#334155',
  },
  countText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
  },
  txRow: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  txMainInfo: {
    flex: 1,
  },
  txHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  txDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  creditText: {
    color: '#22c55e',
  },
  debitText: {
    color: '#ef4444',
  },
  txDetailsLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e3a8a',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  badgeSale: {
    color: '#15803d',
    backgroundColor: '#f0fdf4',
  },
  badgePurchase: {
    color: '#b45309',
    backgroundColor: '#fffbeb',
  },
  badgePayment: {
    color: '#4f46e5',
    backgroundColor: '#e0e7ff',
  },
  invoiceNo: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  invoiceLink: {
    color: '#1d4ed8',
    textDecorationLine: 'underline',
  },
  txBalance: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  balanceTypeSmall: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  particulars: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginTop: 2,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 10,
  },
  pageBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginTop: Platform.OS === 'ios' ? 90 : 60,
    marginRight: 16,
    padding: 4,
    width: 170,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
});
