import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { downloadInvoicePdf } from '@/services/downloadHelper';

interface InvoiceItem {
  productName: string;
  quantity: number;
  unitType: string;
  rate: number;
  total: number;
}

interface InvoiceDetails {
  id?: string;
  reference: string;
  type: string;
  date: string;
  particulars?: string;
  partyName?: string;
  amount: number;
  subTotal?: number;
  taxAmount?: number;
  discount?: number;
  amountPaid?: number;
  dueAmount?: number;
  transportMode?: string;
  vehicleNumber?: string;
  shippingAddress?: string;
  items?: InvoiceItem[];
}

interface InvoicePreviewModalProps {
  visible: boolean;
  invoice: InvoiceDetails | null;
  onClose: () => void;
}

function fmt(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  visible,
  invoice,
  onClose,
}) => {
  if (!invoice) return null;

  const isSale = invoice.type.toUpperCase().includes('SALE');
  const invoiceTitle = isSale ? 'Sale Invoice' : 'Supplier Invoice';
  
  // Find identifier for download (use id UUID if available, otherwise invoice reference code)
  const isByInvoiceNo = !invoice.id;
  const downloadId = invoice.id || invoice.reference;

  const handleDownload = () => {
    downloadInvoicePdf(isSale ? 'SALE' : 'PURCHASE', downloadId, isByInvoiceNo);
  };

  const finalItems = invoice.items || [];
  const taxVal = invoice.taxAmount || 0;
  const subTotalVal = invoice.subTotal || invoice.amount - taxVal;
  const paidVal = invoice.amountPaid || 0;
  const dueVal = invoice.dueAmount || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.modalContent}>
            
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{invoiceTitle}</Text>
                <Text style={styles.subtitle}>{invoice.reference}</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              
              {/* Buyer / Seller Details */}
              <View style={styles.metaSection}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{isSale ? 'Customer:' : 'Supplier:'}</Text>
                  <Text style={styles.metaValue}>{invoice.partyName || invoice.particulars || 'N/A'}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Date:</Text>
                  <Text style={styles.metaValue}>{formatDate(invoice.date)}</Text>
                </View>
              </View>

              {/* Shipping / Vehicle Details */}
              {(invoice.transportMode || invoice.vehicleNumber || invoice.shippingAddress) ? (
                <View style={styles.shippingSection}>
                  {invoice.transportMode ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Transport:</Text>
                      <Text style={styles.metaValue}>{invoice.transportMode}</Text>
                    </View>
                  ) : null}
                  {invoice.vehicleNumber ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Vehicle No:</Text>
                      <Text style={styles.metaValue}>{invoice.vehicleNumber}</Text>
                    </View>
                  ) : null}
                  {invoice.shippingAddress ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Shipping To:</Text>
                      <Text style={styles.metaValue}>{invoice.shippingAddress}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Table Title */}
              <Text style={styles.sectionTitle}>Items Details</Text>

              {/* Items List */}
              {finalItems.length === 0 ? (
                <View style={styles.emptyItems}>
                  <Text style={styles.emptyItemsTxt}>No products listed in this invoice.</Text>
                </View>
              ) : (
                <View style={styles.table}>
                  <View style={[styles.tableRow, styles.tableHeader]}>
                    <Text style={[styles.tableCell, styles.cellProduct, styles.headerCell]}>Product</Text>
                    <Text style={[styles.tableCell, styles.cellQty, styles.headerCell, styles.textRight]}>Qty</Text>
                    <Text style={[styles.tableCell, styles.cellRate, styles.headerCell, styles.textRight]}>Rate</Text>
                    <Text style={[styles.tableCell, styles.cellTotal, styles.headerCell, styles.textRight]}>Total</Text>
                  </View>
                  
                  {finalItems.map((item, index) => (
                    <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.rowAlternate]}>
                      <Text style={[styles.tableCell, styles.cellProduct, styles.cellText]}>{item.productName}</Text>
                      <Text style={[styles.tableCell, styles.cellQty, styles.cellText, styles.textRight]}>{item.quantity} {item.unitType}</Text>
                      <Text style={[styles.tableCell, styles.cellRate, styles.cellText, styles.textRight]}>₹{item.rate}</Text>
                      <Text style={[styles.tableCell, styles.cellTotal, styles.cellTextBold, styles.textRight]}>₹{item.total}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Summary Cards */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>{fmt(subTotalVal)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax Amount (GST)</Text>
                  <Text style={styles.summaryValue}>{fmt(taxVal)}</Text>
                </View>
                {invoice.discount && invoice.discount > 0 ? (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Discount</Text>
                    <Text style={[styles.summaryValue, styles.greenText]}>- {fmt(invoice.discount)}</Text>
                  </View>
                ) : null}
                <View style={[styles.summaryRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>{fmt(invoice.amount)}</Text>
                </View>
              </View>

              {/* Payment Info Badges */}
              <View style={styles.dueContainer}>
                <View style={[styles.dueCard, styles.paidCard]}>
                  <Text style={styles.dueCardLabel}>Paid Amount</Text>
                  <Text style={[styles.dueCardVal, styles.paidText]}>{fmt(paidVal)}</Text>
                </View>
                <View style={[styles.dueCard, styles.pendingCard]}>
                  <Text style={styles.dueCardLabel}>Balance/Due</Text>
                  <Text style={[styles.dueCardVal, styles.pendingText]}>{fmt(dueVal)}</Text>
                </View>
              </View>

            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelTxt}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
                <Text style={styles.downloadTxt}>📥 Download</Text>
              </TouchableOpacity>
            </View>

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  safeContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#f16a0a',
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  closeTxt: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  metaSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  shippingSection: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyItems: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyItemsTxt: {
    color: '#94a3b8',
    fontSize: 13,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    borderBottomColor: '#e2e8f0',
  },
  rowAlternate: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 12,
  },
  cellProduct: {
    flex: 2.2,
  },
  cellQty: {
    flex: 1.2,
  },
  cellRate: {
    flex: 1.2,
  },
  cellTotal: {
    flex: 1.4,
  },
  headerCell: {
    color: '#475569',
    fontWeight: '700',
  },
  cellText: {
    color: '#475569',
    fontWeight: '500',
  },
  cellTextBold: {
    color: '#0f172a',
    fontWeight: '700',
  },
  textRight: {
    textAlign: 'right',
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  greenText: {
    color: '#16a34a',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '800',
  },
  grandTotalValue: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '800',
  },
  dueContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dueCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  paidCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  pendingCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  dueCardLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dueCardVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  paidText: {
    color: '#15803d',
  },
  pendingText: {
    color: '#b45309',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  cancelTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  downloadBtn: {
    flex: 1.5,
    height: 48,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  downloadTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
