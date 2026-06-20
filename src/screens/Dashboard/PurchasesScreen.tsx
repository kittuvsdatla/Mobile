import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchPurchases, deletePurchase } from '@/store/slices/purchasesSlice';
import { apiService }          from '@/services/apiService';
import { LoadingSpinner }      from '@/components/ui/LoadingSpinner';
import { EmptyState }          from '@/components/ui/EmptyState';
import { Badge }               from '@/components/ui/Badge';
import CreatePurchaseModal     from '@/components/modals/CreatePurchaseModal';
import type { Purchase }       from '@/types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function formatAmount(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PurchasesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((state: RootState) => state.purchases);

  const [expanded,       setExpanded]       = useState<string | null>(null);
  const [refreshing,     setRefreshing]     = useState(false);
  const [showCreate,     setShowCreate]     = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);

  useEffect(() => { dispatch(fetchPurchases(undefined)); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchPurchases(undefined));
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Purchase', 'This will reverse stock changes.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deletePurchase(id)) },
    ]);
  };

  const handlePdf = (id: string) => {
    apiService.openPurchasePdf(id);
  };

  const totalExpenses = items.reduce((sum, p) => sum + (p.finalTotal || 0), 0);

  if (isLoading && !items.length) { return <LoadingSpinner message="Loading purchases..." />; }

  return (
    <View style={styles.screen}>
      {/* Summary Bar */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{items.length}</Text>
          <Text style={styles.summaryLabel}>Total Purchases</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{formatAmount(totalExpenses)}</Text>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.createTxt}>+ Create Purchase</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={p => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
        ListEmptyComponent={<EmptyState icon="🛒" title="No purchases yet" subtitle="Tap '+ Create Purchase' above to get started" />}
        renderItem={({ item }) => {
          const isOpen = expanded === item.id;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setExpanded(isOpen ? null : item.id)}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoice}>{item.invoiceNumber}</Text>
                  <Text style={styles.partyName}>{item.partyName || item.party?.name}</Text>
                  <Text style={styles.date}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.amountInfo}>
                  <Text style={styles.amount}>{formatAmount(item.finalTotal)}</Text>
                  <Badge
                    label={item.dueAmount > 0 ? `Due: ${formatAmount(item.dueAmount)}` : 'Paid'}
                    variant={item.dueAmount > 0 ? 'warning' : 'success'}
                  />
                  <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </View>
              </View>

              {isOpen && (
                <View style={styles.details}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment:</Text>
                    <Text style={styles.detailValue}>{item.paymentType} / {item.paymentMode}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Paid:</Text>
                    <Text style={styles.detailValue}>{formatAmount(item.amountPaid || 0)}</Text>
                  </View>
                  {item.vehicleNumber ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Vehicle:</Text>
                      <Text style={styles.detailValue}>{item.vehicleNumber}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.itemsTitle}>Items:</Text>
                  {(item.items || []).map((pi, idx) => (
                    <View key={pi.id ?? idx} style={styles.purchaseItem}>
                      <Text style={styles.piName}>{pi.productName}</Text>
                      <Text style={styles.piMeta}>{pi.quantity} {pi.unitType} × ₹{pi.rate} = {formatAmount(pi.total)}</Text>
                    </View>
                  ))}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => { setEditingPurchase(item); setExpanded(null); }}
                    >
                      <Text style={styles.editTxt}>✏️ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pdfBtn} onPress={() => handlePdf(item.id)}>
                      <Text style={styles.pdfText}>📄 PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                      <Text style={styles.deleteText}>🗑 Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />

      <CreatePurchaseModal visible={showCreate} onClose={() => setShowCreate(false)} />
      <CreatePurchaseModal visible={!!editingPurchase} onClose={() => setEditingPurchase(null)} initialData={editingPurchase} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#f9fafb' },
  summaryRow:    { flexDirection: 'row', backgroundColor: '#06b6d4', paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  summaryItem:   { flex: 1, alignItems: 'center' },
  summaryValue:  { fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 2 },
  summaryLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  divider:       { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 8 },
  createBtn:     { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  createTxt:     { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  list:          { padding: 12, paddingBottom: 32 },
  card:          { backgroundColor: '#ffffff', borderRadius: 14, marginBottom: 10, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  invoiceInfo:   { gap: 3, flex: 1 },
  invoice:       { fontSize: 13, fontWeight: '700', color: '#06b6d4' },
  partyName:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  date:          { fontSize: 12, color: '#9ca3af' },
  amountInfo:    { alignItems: 'flex-end', gap: 6 },
  amount:        { fontSize: 17, fontWeight: '800', color: '#06b6d4' },
  chevron:       { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  details:       { borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 14, backgroundColor: '#f9fafb' },
  detailRow:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  detailLabel:   { fontSize: 13, fontWeight: '600', color: '#6b7280', width: 72 },
  detailValue:   { fontSize: 13, color: '#374151', flex: 1 },
  itemsTitle:    { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4 },
  purchaseItem:  { backgroundColor: '#ffffff', borderRadius: 8, padding: 10, marginBottom: 6 },
  piName:        { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  piMeta:        { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  actionRow:     { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn:       { flex: 1, backgroundColor: '#ecfeff', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  editTxt:       { fontSize: 13, fontWeight: '700', color: '#0e7490' },
  pdfBtn:        { flex: 1, backgroundColor: '#dbeafe', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  pdfText:       { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  deleteBtn:     { flex: 1, backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  deleteText:    { fontSize: 13, fontWeight: '700', color: '#dc2626' },
});
