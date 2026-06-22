/**
 * InvoicePreviewModal — Full-detail invoice popup
 * Shows: invoice number, party name, date, all items (product, qty, unit, rate, amount),
 * sub-total, GST, discount, freight, grand total, amount paid, balance due,
 * transport details, and a Print PDF button.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity,
  ScrollView, SafeAreaView, ActivityIndicator, Platform, Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { apiService } from '@/services/apiService';
import { downloadInvoicePdf } from '@/services/downloadHelper';

// ── Design Tokens ──────────────────────────────────────────────────────────────
const C = {
  navy:     '#0f172a',
  navyMid:  '#1e293b',
  emerald:  '#10b981',
  emeraldBg:'#ecfdf5',
  indigo:   '#6366f1',
  indigoBg: '#eef2ff',
  rose:     '#f43f5e',
  roseBg:   '#fff1f2',
  amber:    '#f59e0b',
  amberBg:  '#fffbeb',
  slate:    '#f8fafc',
  border:   '#e2e8f0',
  muted:    '#64748b',
  t1:       '#0f172a',
  t2:       '#334155',
  t3:       '#64748b',
  t4:       '#94a3b8',
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  productName: string;
  quantity: number;
  unitType: string;
  rate: number;
  total: number;
  hsnCode?: string | null;
  gstPercentage?: number;
  taxableAmount?: number;
  gstAmount?: number;
}

export interface InvoiceDetails {
  id?: string;
  invoiceNumber?: string;
  reference?: string;
  type: string;
  date: string;
  particulars?: string;
  partyName?: string;
  partyPhone?: string | null;
  amount?: number;
  finalTotal?: number;
  subTotal?: number;
  taxableSubtotal?: number;
  subtotal?: number;
  taxAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  discount?: number;
  amountPaid?: number;
  dueAmount?: number;
  transportMode?: string;
  transporterName?: string | null;
  vehicleNumber?: string | null;
  shippingAddress?: string;
  deliveryLocation?: string | null;
  freightCharge?: number;
  transportCharges?: number;
  paymentMode?: string;
  paymentType?: string;
  notes?: string | null;
  items?: InvoiceItem[];
}

interface Props {
  visible: boolean;
  invoice: InvoiceDetails | null;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n?: number | null): string {
  return '₹' + ((n ?? 0) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(s?: string | null): string {
  if (!s) return '—';
  const clean = s.split('T')[0];
  const p = clean.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s;
}

function getInvoiceRef(data: InvoiceDetails): string {
  return data.invoiceNumber || data.reference || '—';
}

// Normalise an API Sale/Purchase response → InvoiceDetails shape
function normaliseApiResponse(raw: any, type: string): InvoiceDetails {
  return {
    id:             raw.id,
    invoiceNumber:  raw.invoiceNumber,
    reference:      raw.invoiceNumber,
    type,
    date:           raw.date,
    partyName:      raw.partyName || raw.party?.name,
    partyPhone:     raw.partyPhone || raw.party?.phone,
    finalTotal:     raw.finalTotal,
    amount:         raw.finalTotal,
    subTotal:       raw.subtotal ?? raw.taxableSubtotal,
    taxableSubtotal:raw.taxableSubtotal,
    subtotal:       raw.subtotal,
    taxAmount:      (raw.cgstAmount ?? 0) + (raw.sgstAmount ?? 0),
    cgstAmount:     raw.cgstAmount,
    sgstAmount:     raw.sgstAmount,
    discount:       raw.discount ?? 0,
    amountPaid:     raw.amountPaid,
    dueAmount:      raw.dueAmount,
    transporterName:raw.transporterName,
    vehicleNumber:  raw.vehicleNumber,
    deliveryLocation:raw.deliveryLocation,
    freightCharge:  raw.transportCharges ?? raw.freightCharge,
    transportCharges:raw.transportCharges,
    paymentMode:    raw.paymentMode,
    paymentType:    raw.paymentType,
    notes:          raw.notes,
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
}

// ── Component ──────────────────────────────────────────────────────────────────
export const InvoicePreviewModal: React.FC<Props> = ({ visible, invoice, onClose }) => {
  const [isDuplicate,   setIsDuplicate]   = useState(false);
  const [data,          setData]          = useState<InvoiceDetails | null>(null);
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    if (!visible || !invoice) { setData(null); return; }

    setIsDuplicate(false);
    setData(null); // clear stale data from previous invoice

    const id      = invoice.id;
    const invNum  = invoice.invoiceNumber || invoice.reference;
    const isSale  = (invoice.type || '').toUpperCase().includes('SALE');

    // Always fetch full detail from API when we have an id
    if (id) {
      setLoading(true);
      const fetcher = isSale
        ? apiService.getSaleDetail(id)
        : apiService.getPurchaseDetail(id);

      fetcher
        .then(res => {
          if (res.success && res.data) {
            setData(normaliseApiResponse(res.data, isSale ? 'SALE' : 'PURCHASE'));
          } else {
            setData(invoice);
          }
        })
        .catch(() => setData(invoice))
        .finally(() => setLoading(false));
      return;
    }

    // No id — use whatever we have (header info only, no items/transport)
    setData(invoice);
  }, [visible, invoice?.id, invoice?.invoiceNumber, invoice?.reference]);

  if (!invoice) return null;

  const display     = data ?? invoice;
  const isSale      = (display.type || '').toUpperCase().includes('SALE');
  const accentColor = isSale ? C.emerald : C.indigo;
  const accentBg    = isSale ? C.emeraldBg : C.indigoBg;
  const items       = display.items ?? [];
  const invoiceRef  = getInvoiceRef(display);
  const grandTotal  = display.finalTotal ?? display.amount ?? 0;
  const subTotal    = display.subTotal ?? display.subtotal ?? display.taxableSubtotal ?? grandTotal;
  const taxAmount   = display.taxAmount ?? ((display.cgstAmount ?? 0) + (display.sgstAmount ?? 0));
  const discount    = display.discount ?? 0;
  const freight     = display.freightCharge ?? display.transportCharges ?? 0;
  const paid        = display.amountPaid ?? 0;
  const due         = display.dueAmount ?? Math.max(0, grandTotal - paid);

  const handlePrint = () => {
    const id  = display.id;
    const ref = invoiceRef;
    if (id) {
      isSale
        ? apiService.openSalePdf(id, isDuplicate)
        : apiService.openPurchasePdf(id, isDuplicate);
    } else if (ref && ref !== '—') {
      isSale
        ? apiService.openSalePdfByInvoice(ref, isDuplicate)
        : apiService.openPurchasePdfByInvoice(ref, isDuplicate);
    }
    downloadInvoicePdf(
      isSale ? 'SALE' : 'PURCHASE',
      id || ref,
      !id,
      isDuplicate
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={S.backdrop}>
        {/* Sheet uses a fixed height so ScrollView can flex:1 correctly */}
        <View style={S.sheet}>

          {/* ── Gradient Header ──────────────────────────────────────────── */}
          <LinearGradient
            colors={isSale ? ['#064e3b', '#10b981'] : ['#1e1b4b', '#6366f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.headerGradient}
          >
            <SafeAreaView>
              <View style={S.headerRow}>
                {/* Type Badge + Duplicate */}
                <View style={S.badgeRow}>
                  <View style={[S.typeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={S.typeBadgeTxt}>
                      {isSale ? '🧾  SALE' : '📦  PURCHASE'}
                    </Text>
                  </View>
                  {isDuplicate && (
                    <View style={S.dupBadge}>
                      <Text style={S.dupBadgeTxt}>DUPLICATE</Text>
                    </View>
                  )}
                </View>
                {/* Close */}
                <TouchableOpacity style={S.closeBtn} onPress={onClose} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                  <Text style={S.closeTxt}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Invoice # + Party */}
              <Text style={S.invoiceNo}>Invoice #{invoiceRef}</Text>
              <Text style={S.partyName} numberOfLines={2}>
                {display.partyName || '—'}
              </Text>

              {/* Meta row */}
              <View style={S.metaRow}>
                <View style={S.metaChip}>
                  <Text style={S.metaChipTxt}>📅  {fmtDate(display.date)}</Text>
                </View>
                {display.paymentMode && (
                  <View style={S.metaChip}>
                    <Text style={S.metaChipTxt}>💳  {display.paymentMode}</Text>
                  </View>
                )}
                {display.partyPhone && (
                  <View style={S.metaChip}>
                    <Text style={S.metaChipTxt}>📞  {display.partyPhone}</Text>
                  </View>
                )}
              </View>
            </SafeAreaView>
          </LinearGradient>

          {/* ── Body — MUST be flex:1 so ScrollView can expand ──────────── */}
          <View style={S.body}>
            {loading ? (
              <View style={S.loadBox}>
                <ActivityIndicator size="large" color={accentColor} />
                <Text style={S.loadTxt}>Loading invoice details…</Text>
              </View>
            ) : (
              <ScrollView
                style={S.scroll}
                contentContainerStyle={S.scrollContent}
                showsVerticalScrollIndicator={false}
              >

              {/* ── Items Table ──────────────────────────────────────────── */}
              <SectionTitle icon="📦" title="Items" />
              {items.length === 0 ? (
                <View style={S.emptyBox}>
                  <Text style={S.emptyTxt}>No item details available.</Text>
                </View>
              ) : (
                <View style={S.tableCard}>
                  {/* Table Header */}
                  <View style={[S.tRow, S.tHead]}>
                    <Text style={[S.tCell, { flex: 2.6 }, S.tHeadTxt]}>Product</Text>
                    <Text style={[S.tCell, { flex: 1.2 }, S.tHeadTxt, S.tR]}>Qty</Text>
                    <Text style={[S.tCell, { flex: 1.3 }, S.tHeadTxt, S.tR]}>Rate</Text>
                    <Text style={[S.tCell, { flex: 1.5 }, S.tHeadTxt, S.tR]}>Amount</Text>
                  </View>
                  {/* Table Rows */}
                  {items.map((item, idx) => (
                    <View key={idx} style={[S.tRow, idx % 2 === 1 && { backgroundColor: '#f8fafc' }]}>
                      <View style={{ flex: 2.6 }}>
                        <Text style={S.tProductName} numberOfLines={2}>{item.productName}</Text>
                        {item.hsnCode ? (
                          <Text style={S.tSubText}>HSN: {item.hsnCode}</Text>
                        ) : null}
                        {(item.gstPercentage ?? 0) > 0 ? (
                          <Text style={S.tSubText}>GST: {item.gstPercentage}%</Text>
                        ) : null}
                      </View>
                      <Text style={[S.tCell, { flex: 1.2 }, S.tBodyTxt, S.tR]}>
                        {item.quantity}{item.unitType ? ` ${item.unitType}` : ''}
                      </Text>
                      <Text style={[S.tCell, { flex: 1.3 }, S.tMutedTxt, S.tR]}>
                        {fmt(item.rate)}
                      </Text>
                      <Text style={[S.tCell, { flex: 1.5 }, S.tBoldTxt, S.tR]}>
                        {fmt(item.total)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Totals Card ──────────────────────────────────────────── */}
              <SectionTitle icon="🧮" title="Bill Summary" />
              <View style={S.totalsCard}>
                <TotalRow label="Sub-Total (Taxable)" value={fmt(subTotal)} />
                {taxAmount > 0 && (
                  <>
                    {(display.cgstAmount ?? 0) > 0 && (
                      <TotalRow label="CGST" value={fmt(display.cgstAmount)} color={C.muted} />
                    )}
                    {(display.sgstAmount ?? 0) > 0 && (
                      <TotalRow label="SGST" value={fmt(display.sgstAmount)} color={C.muted} />
                    )}
                    {(display.cgstAmount ?? 0) === 0 && (
                      <TotalRow label="GST / Tax" value={fmt(taxAmount)} color={C.muted} />
                    )}
                  </>
                )}
                {discount > 0 && (
                  <TotalRow label="Discount" value={`− ${fmt(discount)}`} color={C.emerald} />
                )}
                {freight > 0 && (
                  <TotalRow label="Freight / Transport" value={fmt(freight)} />
                )}
                <View style={S.grandDivider} />
                <TotalRow label="Grand Total" value={fmt(grandTotal)} bold large />
              </View>

              {/* ── Payment Summary ──────────────────────────────────────── */}
              <View style={S.payRow}>
                <View style={[S.payCard, { backgroundColor: C.emeraldBg, borderColor: '#a7f3d0' }]}>
                  <Text style={S.payCardIcon}>✅</Text>
                  <Text style={S.payCardLbl}>Amount Paid</Text>
                  <Text style={[S.payCardAmt, { color: C.emerald }]}>{fmt(paid)}</Text>
                </View>
                <View style={[
                  S.payCard,
                  { backgroundColor: due > 0 ? C.roseBg : C.emeraldBg, borderColor: due > 0 ? '#fca5a5' : '#a7f3d0' },
                ]}>
                  <Text style={S.payCardIcon}>{due > 0 ? '⚠️' : '✅'}</Text>
                  <Text style={S.payCardLbl}>{due > 0 ? 'Balance Due' : 'Settled'}</Text>
                  <Text style={[S.payCardAmt, { color: due > 0 ? C.rose : C.emerald }]}>
                    {due > 0 ? fmt(due) : '✓ Cleared'}
                  </Text>
                </View>
              </View>

              {/* ── Transport Details ────────────────────────────────────── */}
              {/* Show when ANY transport field exists — check each individually */}
              {Boolean(
                display.transporterName ||
                display.vehicleNumber ||
                display.deliveryLocation ||
                display.shippingAddress ||
                freight > 0
              ) && (
                <>
                  <SectionTitle icon="🚛" title="Transport Details" />
                  <View style={[S.infoCard, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}>
                    {display.transporterName ? (
                      <InfoRow label="Transporter" value={String(display.transporterName)} />
                    ) : null}
                    {display.vehicleNumber ? (
                      <InfoRow label="Vehicle No." value={String(display.vehicleNumber)} />
                    ) : null}
                    {(display.deliveryLocation || display.shippingAddress) ? (
                      <InfoRow
                        label="Delivery Location"
                        value={String(display.deliveryLocation || display.shippingAddress)}
                      />
                    ) : null}
                    {freight > 0 ? (
                      <InfoRow label="Freight / Transport" value={fmt(freight)} accent={C.indigo} />
                    ) : null}
                    {!display.transporterName && !display.vehicleNumber && !display.deliveryLocation && !display.shippingAddress && freight <= 0 ? (
                      <Text style={{ fontSize: 13, color: C.muted, fontStyle: 'italic', paddingVertical: 4 }}>
                        No transport details recorded
                      </Text>
                    ) : null}
                  </View>
                </>
              )}

              {/* ── Notes ──────────────────────────────────────────────── */}
              {display.notes && display.notes.trim() !== '' ? (
                <>
                  <SectionTitle icon="📝" title="Order Notes" />
                  <View style={S.notesCard}>
                    <Text style={S.notesTxt}>{display.notes}</Text>
                  </View>
                </>
              ) : null}

              <View style={{ height: 24 }} />
              </ScrollView>
            )}
          </View>{/* end body */}

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <View style={S.footer}>
            {/* Duplicate toggle */}
            <TouchableOpacity
              style={S.dupToggle}
              onPress={() => setIsDuplicate(d => !d)}
              activeOpacity={0.8}
            >
              <View style={[S.checkbox, isDuplicate && S.checkboxOn]}>
                {isDuplicate && <Text style={S.checkmark}>✓</Text>}
              </View>
              <Text style={S.dupLabel}>Duplicate</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity style={S.closeFootBtn} onPress={onClose}>
              <Text style={S.closeFootTxt}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[S.printBtn, { backgroundColor: accentColor }]}
              onPress={handlePrint}
            >
              <Text style={S.printTxt}>🖨️  Print</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

// ── Small sub-components ───────────────────────────────────────────────────────
function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={S.sectionTitle}>
      <Text style={S.sectionIcon}>{icon}</Text>
      <Text style={S.sectionTxt}>{title}</Text>
    </View>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={S.infoRow}>
      <Text style={S.infoLabel}>{label}</Text>
      <Text style={[S.infoValue, accent ? { color: accent } : {}]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function TotalRow({
  label, value, color, bold, large,
}: {
  label: string; value: string; color?: string; bold?: boolean; large?: boolean;
}) {
  return (
    <View style={S.totalRow}>
      <Text style={[S.totalLabel, bold && { color: C.navy, fontWeight: '800' }, large && { fontSize: 15 }]}>
        {label}
      </Text>
      <Text style={[
        S.totalValue,
        color ? { color } : {},
        bold && { color: C.navy, fontWeight: '900' },
        large && { fontSize: 17 },
      ]}>
        {value}
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Modal Container
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  // Fixed height (93% of screen) so that flex:1 children (body/scroll) work correctly.
  // Without a defined height, ScrollView with flex:1 collapses to 0px.
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: Dimensions.get('window').height * 0.93,
    overflow: 'hidden',
  },
  // flex:1 wrapper — takes all space between header and footer
  body: {
    flex: 1,
  },

  // Header Gradient
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  typeBadgeTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  dupBadge: {
    backgroundColor: C.amberBg,
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dupBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: C.amber,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeTxt: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '900',
  },
  invoiceNo: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  partyName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  metaChipTxt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },

  // Loader — must flex:1 to fill body container
  loadBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  loadTxt: {
    marginTop: 14,
    fontSize: 14,
    color: C.muted,
    fontWeight: '600',
  },

  // Scroll — flex:1 fills the body View (which also has flex:1)
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },

  // Section Title
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionIcon: { fontSize: 14 },
  sectionTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Items Table
  tableCard: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'flex-start',
  },
  tHead: {
    backgroundColor: C.navy,
    paddingVertical: 11,
  },
  tCell: { fontSize: 12 },
  tHeadTxt: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.navy,
    marginBottom: 2,
  },
  tSubText: {
    fontSize: 10,
    color: C.t3,
    fontWeight: '500',
    marginTop: 1,
  },
  tBodyTxt: { color: C.navy, fontWeight: '600' },
  tMutedTxt: { color: C.muted, fontWeight: '500' },
  tBoldTxt:  { color: C.navy, fontWeight: '800' },
  tR:        { textAlign: 'right' },

  // Empty
  emptyBox: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: C.slate,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTxt: { color: C.muted, fontSize: 13, fontWeight: '500' },

  // Totals
  totalsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  totalLabel: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 13,
    color: C.t2,
    fontWeight: '700',
  },
  grandDivider: {
    height: 1.5,
    backgroundColor: C.navy,
    marginVertical: 10,
    opacity: 0.12,
  },

  // Payment Cards
  payRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  payCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
  },
  payCardIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  payCardLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  payCardAmt: {
    fontSize: 16,
    fontWeight: '900',
  },

  // Info Card (Transport, Notes)
  infoCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 13,
    color: C.muted,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: C.navy,
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },

  // Notes
  notesCard: {
    backgroundColor: C.amberBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 14,
    marginBottom: 20,
  },
  notesTxt: {
    fontSize: 13,
    color: C.t2,
    fontWeight: '500',
    lineHeight: 20,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.slate,
    gap: 10,
  },
  dupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: C.amber,
    borderColor: C.amber,
  },
  checkmark: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '900',
  },
  dupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
  },
  closeFootBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFootTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: C.muted,
  },
  printBtn: {
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  printTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
});
