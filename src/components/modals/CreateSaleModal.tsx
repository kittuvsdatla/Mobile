/**
 * CreateSaleModal — Full-screen mobile modal to create/edit a Sale.
 * Mirrors the web CreateSaleModal with all fields:
 *   Invoice number, Customer, Date, Line items (product/qty/rate),
 *   Optional transport details, Payment type, Amount paid, Notes.
 * Includes inline creation of Customer and Transporter.
 */
import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootState, AppDispatch } from '@/store';
import { createSale, updateSale } from '@/store/slices/salesSlice';
import { fetchStock } from '@/store/slices/stockSlice';
import { fetchDues } from '@/store/slices/duesSlice';
import { addParty } from '@/store/slices/partiesSlice';
import { addTransporter } from '@/store/slices/transportersSlice';
import { apiService } from '@/services/apiService';
import { Modal as UiModal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Sale } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialData?: Sale | null;
}

interface LineItem {
  productId: string;
  quantity: string;
  rate: string;
}

const PAYMENT_MODES = ['Cash', 'UPI', 'Cheque', 'Bank Transfer'] as const;

export default function CreateSaleModal({ visible, onClose, initialData }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { customers } = useSelector((s: RootState) => s.parties);
  const { items: allProducts } = useSelector((s: RootState) => s.products);
  const { items: stockItems }  = useSelector((s: RootState) => s.stock);
  const { items: transporters } = useSelector((s: RootState) => s.transporters);

  // Products that have stock > 0
  const products = allProducts.filter(p =>
    stockItems.find(si => si.product.id === p.id && si.quantity > 0)
  );

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [partyId,       setPartyId]       = useState('');
  const [date,          setDate]          = useState(new Date().toISOString().split('T')[0]);
  const [paymentType,   setPaymentType]   = useState<'cash' | 'credit'>('cash');
  const [paymentMode,   setPaymentMode]   = useState('Cash');
  const [amountPaid,    setAmountPaid]    = useState('');
  const [notes,         setNotes]         = useState('');

  const [items, setItems] = useState<LineItem[]>([
    { productId: '', quantity: '1', rate: '' },
  ]);

  const [enableTransport,    setEnableTransport]    = useState(false);
  const [transporterId,      setTransporterId]      = useState('');
  const [transportCharges,   setTransportCharges]   = useState('');
  const [vehicleNumber,      setVehicleNumber]      = useState('');
  const [deliveryLocation,   setDeliveryLocation]   = useState('');

  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Picker states (simple modal pickers for mobile)
  const [showCustomerPicker,    setShowCustomerPicker]    = useState(false);
  const [showTransporterPicker, setShowTransporterPicker] = useState(false);
  const [activeProductIdx,      setActiveProductIdx]      = useState<number | null>(null);

  // Inline add Customer state
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', address: '', state: '', gstNumber: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Inline add Transporter state
  const [showAddTransporter, setShowAddTransporter] = useState(false);
  const [transporterForm, setTransporterForm] = useState({ name: '', phone: '', vehicleNumber: '', address: '' });
  const [savingTransporter, setSavingTransporter] = useState(false);

  // Load invoice number and pre-fill for edits
  useEffect(() => {
    if (!visible) { return; }
    if (initialData) {
      setInvoiceNumber(initialData.invoiceNumber || '');
      setPartyId(initialData.party?.id || '');
      setDate(initialData.date || new Date().toISOString().split('T')[0]);
      setPaymentType((initialData.paymentType as 'cash' | 'credit') || 'cash');
      setPaymentMode(initialData.paymentMode || 'Cash');
      setAmountPaid(String(initialData.amountPaid || ''));
      setNotes(initialData.notes || '');
      setItems(
        (initialData.items || []).map(i => ({
          productId: allProducts.find(p => p.name === i.productName)?.id || '',
          quantity:  String(i.quantity),
          rate:      String(i.rate),
        }))
      );
      const hasTransport = !!(initialData.transportCharges || initialData.vehicleNumber);
      setEnableTransport(hasTransport);
      setTransporterId(initialData.transporterName ? transporters.find(t => t.name === initialData.transporterName)?.id || '' : '');
      setTransportCharges(String(initialData.transportCharges || ''));
      setVehicleNumber(initialData.vehicleNumber || '');
      setDeliveryLocation(initialData.deliveryLocation || '');
    } else {
      // Reset form
      setPartyId(''); setDate(new Date().toISOString().split('T')[0]);
      setPaymentType('cash'); setPaymentMode('Cash'); setAmountPaid('');
      setNotes(''); setItems([{ productId: '', quantity: '1', rate: '' }]);
      setEnableTransport(false); setTransporterId('');
      setTransportCharges(''); setVehicleNumber(''); setDeliveryLocation('');
      setErrorMsg('');
      // Fetch next invoice number
      apiService.getNextSaleInvoice().then(res => {
        if (res.data) { setInvoiceNumber(res.data.invoiceNumber); }
      }).catch(() => {});
    }
  }, [visible, initialData]);

  // Computed totals
  let taxableSubtotal = 0;
  let totalGst = 0;
  items.forEach(item => {
    const p = allProducts.find(pr => pr.id === item.productId);
    const qty  = Number(item.quantity) || 0;
    const rate = Number(item.rate)     || 0;
    const taxable  = qty * rate;
    const gstAmt   = taxable * ((p?.gstPercentage || 0) / 100);
    taxableSubtotal += taxable;
    totalGst        += gstAmt;
  });
  const subtotal   = taxableSubtotal + totalGst;
  const grandTotal = subtotal + (enableTransport ? Number(transportCharges || 0) : 0);

  const handleAddItem = () =>
    setItems(prev => [...prev, { productId: '', quantity: '1', rate: '' }]);

  const handleRemoveItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, key: keyof LineItem, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!partyId) { setErrorMsg('Please select a customer'); return; }
    if (items.some(i => !i.productId || !Number(i.quantity) || !Number(i.rate))) {
      setErrorMsg('Please fill all item details correctly'); return;
    }
    const paid = Number(amountPaid) || 0;
    if (paid > grandTotal) {
      setErrorMsg(`Amount paid cannot exceed grand total (₹${grandTotal.toLocaleString()})`); return;
    }
    setLoading(true);
    try {
      const payload: any = {
        invoiceNumber, partyId, date,
        paymentType, paymentMode,
        amountPaid: paymentType === 'credit' ? paid : undefined,
        notes: notes || undefined,
        transporterId: enableTransport ? transporterId || undefined : undefined,
        transportCharges: enableTransport && transportCharges ? Number(transportCharges) : undefined,
        vehicleNumber:    enableTransport ? vehicleNumber || undefined : undefined,
        deliveryLocation: enableTransport ? deliveryLocation || undefined : undefined,
        items: items.map(i => ({
          productId: i.productId,
          quantity:  Number(i.quantity),
          rate:      Number(i.rate),
        })),
      };
      if (initialData) {
        await dispatch(updateSale({ id: initialData.id, data: payload })).unwrap();
      } else {
        await dispatch(createSale(payload)).unwrap();
      }
      dispatch(fetchStock());
      dispatch(fetchDues(undefined));
      onClose();
    } catch (err: any) {
      setErrorMsg(typeof err === 'string' ? err : 'Failed to save sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomerInline = async () => {
    if (!customerForm.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSavingCustomer(true);
    try {
      const res = await dispatch(addParty({ ...customerForm, type: 'CUSTOMER' })).unwrap();
      setPartyId(res.id);
      setShowAddCustomer(false);
      setCustomerForm({ name: '', phone: '', address: '', state: '', gstNumber: '' });
      Alert.alert('Success', 'Customer added successfully');
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to add customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleAddTransporterInline = async () => {
    if (!transporterForm.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSavingTransporter(true);
    try {
      const res = await dispatch(addTransporter(transporterForm)).unwrap();
      setTransporterId(res.id);
      if (res.vehicleNumber) {
        setVehicleNumber(res.vehicleNumber);
      }
      setShowAddTransporter(false);
      setTransporterForm({ name: '', phone: '', vehicleNumber: '', address: '' });
      Alert.alert('Success', 'Transporter added successfully');
    } catch (err: any) {
      Alert.alert('Error', err || 'Failed to add transporter');
    } finally {
      setSavingTransporter(false);
    }
  };

  const selectedCustomer  = customers.find(c => c.id === partyId);
  const selectedTransporter = transporters.find(t => t.id === transporterId);

  return (
    <Modal visible={visible} statusBarTranslucent={true} navigationBarTranslucent={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.root}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>{initialData ? 'Edit Sale' : 'Create Sale'}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {errorMsg ? <View style={styles.errorBox}><Text style={styles.errorTxt}>{errorMsg}</Text></View> : null}

          {/* Invoice + Date */}
          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Invoice Number</Text>
              <TextInput style={styles.input} value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="SAL-0001" />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Date</Text>
              <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            </View>
          </View>

          {/* Customer */}
          <Text style={styles.label}>Customer *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCustomerPicker(true)}>
            <Text style={[styles.pickerTxt, !selectedCustomer && { color: '#9ca3af' }]}>
              {selectedCustomer ? selectedCustomer.name : 'Select Customer...'}
            </Text>
            <Text style={styles.pickerChev}>▼</Text>
          </TouchableOpacity>

          {/* Items */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items</Text>
            <TouchableOpacity onPress={handleAddItem} style={styles.addItemBtn}>
              <Text style={styles.addItemTxt}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, idx) => {
            const prod = allProducts.find(p => p.id === item.productId);
            const stockQty = stockItems.find(s => s.product.id === item.productId)?.quantity ?? 0;
            const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
            return (
              <View key={idx} style={styles.itemCard}>
                <TouchableOpacity style={styles.picker} onPress={() => setActiveProductIdx(idx)}>
                  <Text style={[styles.pickerTxt, !item.productId && { color: '#9ca3af' }]}>
                    {prod ? `${prod.name} (Stock: ${stockQty} ${prod.unitType})` : 'Select Product...'}
                  </Text>
                  <Text style={styles.pickerChev}>▼</Text>
                </TouchableOpacity>
                <View style={styles.row2}>
                  <View style={styles.halfField}>
                    <Text style={styles.labelSm}>Qty {prod ? `(${prod.unitType})` : ''}</Text>
                    <TextInput style={styles.input} value={item.quantity} onChangeText={v => updateItem(idx, 'quantity', v)} keyboardType="numeric" placeholder="1" />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.labelSm}>Rate (₹)</Text>
                    <TextInput style={styles.input} value={item.rate} onChangeText={v => updateItem(idx, 'rate', v)} keyboardType="numeric" placeholder="0.00" />
                  </View>
                </View>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemTotal}>₹{lineTotal.toLocaleString()}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveItem(idx)} style={styles.removeBtn}>
                      <Text style={styles.removeTxt}>🗑 Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {/* Totals */}
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLbl}>Taxable Amount</Text>
              <Text style={styles.totalVal}>₹{taxableSubtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLbl}>Total GST</Text>
              <Text style={styles.totalVal}>₹{totalGst.toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowBig]}>
              <Text style={styles.grandLbl}>Subtotal</Text>
              <Text style={styles.grandVal}>₹{subtotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Transport toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setEnableTransport(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, enableTransport && styles.checkboxActive]}>
              {enableTransport && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.toggleLbl}>Add Transport Details</Text>
          </TouchableOpacity>

          {enableTransport && (
            <View style={styles.transportBox}>
              <Text style={styles.label}>Transporter</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowTransporterPicker(true)}>
                <Text style={[styles.pickerTxt, !selectedTransporter && { color: '#9ca3af' }]}>
                  {selectedTransporter ? selectedTransporter.name : 'Select Transporter...'}
                </Text>
                <Text style={styles.pickerChev}>▼</Text>
              </TouchableOpacity>
              <View style={styles.row2}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Transport Charges (₹)</Text>
                  <TextInput style={styles.input} value={transportCharges} onChangeText={setTransportCharges} keyboardType="numeric" placeholder="0" />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Vehicle Number</Text>
                  <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="AP09A1234" autoCapitalize="characters" />
                </View>
              </View>
              <Text style={styles.label}>Delivery Location</Text>
              <TextInput style={styles.input} value={deliveryLocation} onChangeText={setDeliveryLocation} placeholder="Full address..." />
            </View>
          )}

          {/* Grand Total */}
          <View style={styles.grandTotalBox}>
            <Text style={styles.grandLbl}>Grand Total</Text>
            <Text style={styles.grandTotalAmt}>₹{grandTotal.toFixed(2)}</Text>
          </View>

          {/* Payment */}
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.row2}>
            {(['cash', 'credit'] as const).map(pt => (
              <TouchableOpacity
                key={pt}
                style={[styles.modeBtn, paymentType === pt && styles.modeBtnActive]}
                onPress={() => setPaymentType(pt)}
              >
                <Text style={[styles.modeTxt, paymentType === pt && styles.modeTxtActive]}>
                  {pt === 'cash' ? 'Cash / Full' : 'Credit / Partial'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {paymentType === 'credit' && (
            <>
              <Text style={styles.label}>Amount Paid Now (₹)</Text>
              <TextInput style={styles.input} value={amountPaid} onChangeText={setAmountPaid} keyboardType="numeric" placeholder="0.00" />
            </>
          )}

          <Text style={styles.label}>Payment Mode</Text>
          <View style={styles.modeGrid}>
            {PAYMENT_MODES.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeChip, paymentMode === m && styles.modeChipActive]}
                onPress={() => setPaymentMode(m)}
              >
                <Text style={[styles.modeChipTxt, paymentMode === m && styles.modeChipTxtActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Optional notes..." multiline />

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitTxt}>{initialData ? 'Update Sale' : 'Create Sale'}</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="slide" transparent onRequestClose={() => setShowCustomerPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowCustomerPicker(false)}>
          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.pickerHeaderRow}>
              <Text style={styles.pickerTitle}>Select Customer</Text>
              <TouchableOpacity style={styles.addInlineBtn} onPress={() => { setShowCustomerPicker(false); setShowAddCustomer(true); }}>
                <Text style={styles.addInlineTxt}>+ Add Customer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {customers.map(c => (
                <TouchableOpacity key={c.id} style={styles.pickerOption} onPress={() => { setPartyId(c.id); setShowCustomerPicker(false); }}>
                  <Text style={[styles.pickerOptionTxt, c.id === partyId && { color: '#f16a0a', fontWeight: '700' }]}>{c.name}</Text>
                  {c.phone ? <Text style={styles.pickerOptionSub}>📞 {c.phone}</Text> : null}
                </TouchableOpacity>
              ))}
              {customers.length === 0 && <Text style={styles.pickerEmpty}>No customers found</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transporter Picker Modal */}
      <Modal visible={showTransporterPicker} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="slide" transparent onRequestClose={() => setShowTransporterPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowTransporterPicker(false)}>
          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.pickerHeaderRow}>
              <Text style={styles.pickerTitle}>Select Transporter</Text>
              <TouchableOpacity style={styles.addInlineBtn} onPress={() => { setShowTransporterPicker(false); setShowAddTransporter(true); }}>
                <Text style={styles.addInlineTxt}>+ Add Transporter</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.pickerOption} onPress={() => { setTransporterId(''); setShowTransporterPicker(false); }}>
                <Text style={styles.pickerOptionTxt}>— None —</Text>
              </TouchableOpacity>
              {transporters.map(t => (
                <TouchableOpacity key={t.id} style={styles.pickerOption} onPress={() => {
                  setTransporterId(t.id);
                  if (t.vehicleNumber) { setVehicleNumber(t.vehicleNumber); }
                  setShowTransporterPicker(false);
                }}>
                  <Text style={[styles.pickerOptionTxt, t.id === transporterId && { color: '#f16a0a', fontWeight: '700' }]}>{t.name}</Text>
                  {t.vehicleNumber ? <Text style={styles.pickerOptionSub}>🚗 {t.vehicleNumber}</Text> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Product Picker Modal */}
      <Modal visible={activeProductIdx !== null} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="slide" transparent onRequestClose={() => setActiveProductIdx(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setActiveProductIdx(null)}>
          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.pickerTitle}>Select Product</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {products.map(p => {
                const stockQty = stockItems.find(s => s.product.id === p.id)?.quantity ?? 0;
                return (
                  <TouchableOpacity key={p.id} style={styles.pickerOption} onPress={() => {
                    if (activeProductIdx !== null) { updateItem(activeProductIdx, 'productId', p.id); }
                    setActiveProductIdx(null);
                  }}>
                    <Text style={styles.pickerOptionTxt}>{p.name}</Text>
                    <Text style={styles.pickerOptionSub}>Stock: {stockQty} {p.unitType}</Text>
                  </TouchableOpacity>
                );
              })}
              {products.length === 0 && <Text style={styles.pickerEmpty}>No products with stock</Text>}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Inline Add Customer Form Modal */}
      <UiModal visible={showAddCustomer} onClose={() => setShowAddCustomer(false)} title="Add Customer">
        <Input label="Name" value={customerForm.name} onChangeText={v => setCustomerForm(f => ({ ...f, name: v }))} placeholder="Customer name" required />
        <Input label="Phone" value={customerForm.phone} onChangeText={v => setCustomerForm(f => ({ ...f, phone: v }))} placeholder="Phone number" keyboardType="phone-pad" leftIcon="📞" />
        <Input label="Address" value={customerForm.address} onChangeText={v => setCustomerForm(f => ({ ...f, address: v }))} placeholder="Full address" multiline />
        <Input label="State" value={customerForm.state} onChangeText={v => setCustomerForm(f => ({ ...f, state: v }))} placeholder="State name" />
        <Input label="GST Number" value={customerForm.gstNumber} onChangeText={v => setCustomerForm(f => ({ ...f, gstNumber: v }))} placeholder="Optional" autoCapitalize="characters" />
        <Button title={savingCustomer ? 'Saving...' : 'Add'} onPress={handleAddCustomerInline} disabled={savingCustomer} fullWidth style={{ marginTop: 8 }} />
      </UiModal>

      {/* Inline Add Transporter Form Modal */}
      <UiModal visible={showAddTransporter} onClose={() => setShowAddTransporter(false)} title="Add Transporter">
        <Input label="Name" value={transporterForm.name} onChangeText={v => setTransporterForm(f => ({ ...f, name: v }))} placeholder="Transporter name" required />
        <Input label="Phone" value={transporterForm.phone} onChangeText={v => setTransporterForm(f => ({ ...f, phone: v }))} placeholder="Phone number" keyboardType="phone-pad" leftIcon="📞" />
        <Input label="Vehicle Number" value={transporterForm.vehicleNumber} onChangeText={v => setTransporterForm(f => ({ ...f, vehicleNumber: v }))} placeholder="e.g. AP39 AB 1234" autoCapitalize="characters" leftIcon="🚗" />
        <Input label="Address" value={transporterForm.address} onChangeText={v => setTransporterForm(f => ({ ...f, address: v }))} placeholder="Address" multiline />
        <Button title={savingTransporter ? 'Saving...' : 'Add Transporter'} onPress={handleAddTransporterInline} disabled={savingTransporter} fullWidth style={{ marginTop: 8 }} />
      </UiModal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#f9fafb' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle:     { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  closeTxt:        { fontSize: 14, color: '#6b7280', fontWeight: '700' },

  body:            { flex: 1 },
  bodyContent:     { padding: 16 },

  errorBox:        { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorTxt:        { color: '#dc2626', fontSize: 13, fontWeight: '600' },

  row2:            { flexDirection: 'row', gap: 10, marginBottom: 4 },
  halfField:       { flex: 1 },
  label:           { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  labelSm:         { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  input:           { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1f2937' },
  picker:          { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  pickerTxt:       { fontSize: 14, color: '#1f2937', flex: 1 },
  pickerChev:      { fontSize: 12, color: '#9ca3af' },

  sectionHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  addItemBtn:      { backgroundColor: '#fef7ee', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addItemTxt:      { color: '#f16a0a', fontWeight: '700', fontSize: 13 },

  itemCard:        { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  itemFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  itemTotal:       { fontSize: 14, fontWeight: '700', color: '#f16a0a' },
  removeBtn:       { backgroundColor: '#fee2e2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  removeTxt:       { fontSize: 12, color: '#dc2626', fontWeight: '600' },

  totalsBox:       { backgroundColor: '#fef7ee', borderRadius: 12, padding: 14, marginVertical: 10, borderWidth: 1, borderColor: '#fed7aa' },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalRowBig:     { borderTopWidth: 1, borderTopColor: '#fed7aa', marginTop: 4, paddingTop: 8 },
  totalLbl:        { fontSize: 13, color: '#6b7280' },
  totalVal:        { fontSize: 13, fontWeight: '600', color: '#374151' },
  grandLbl:        { fontSize: 14, fontWeight: '700', color: '#111827' },
  grandVal:        { fontSize: 15, fontWeight: '800', color: '#f16a0a' },

  toggleRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 12 },
  checkbox:        { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  checkboxActive:  { borderColor: '#f16a0a', backgroundColor: '#f16a0a' },
  checkmark:       { color: '#fff', fontSize: 12, fontWeight: '800' },
  toggleLbl:       { fontSize: 14, fontWeight: '600', color: '#374151' },

  transportBox:    { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10 },

  grandTotalBox:   { backgroundColor: '#111827', borderRadius: 12, padding: 16, marginVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalAmt:   { fontSize: 20, fontWeight: '800', color: '#f16a0a' },

  modeBtn:         { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  modeBtnActive:   { borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  modeTxt:         { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeTxtActive:   { color: '#f16a0a' },
  modeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  modeChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  modeChipActive:  { borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  modeChipTxt:     { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  modeChipTxtActive:{ color: '#f16a0a' },

  actionRow:       { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn:       { flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelTxt:       { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  submitBtn:       { flex: 2, backgroundColor: '#f16a0a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitTxt:       { fontSize: 15, fontWeight: '800', color: '#fff' },

  pickerOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '65%' },
  pickerTitle:     { fontSize: 16, fontWeight: '800', color: '#111827' },
  pickerOption:    { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerOptionTxt: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  pickerOptionSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  pickerEmpty:     { textAlign: 'center', color: '#9ca3af', paddingVertical: 20 },

  pickerHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 10 },
  addInlineBtn:    { backgroundColor: '#fef7ee', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderEndWidth: 1, borderColor: '#fed7aa' },
  addInlineTxt:    { color: '#f16a0a', fontSize: 12, fontWeight: '700' },
});
