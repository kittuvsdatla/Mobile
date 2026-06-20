import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchProducts, addProduct, editProduct, removeProduct } from '@/store/slices/productsSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState }     from '@/components/ui/EmptyState';
import { Badge }          from '@/components/ui/Badge';
import { Modal }          from '@/components/ui/Modal';
import { Input }          from '@/components/ui/Input';
import { Button }         from '@/components/ui/Button';
import type { Product }   from '@/types';

const UNIT_TYPES: Product['unitType'][] = ['KG', 'GRAM', 'BAG', 'PIECE', 'LITRE', 'BOX'];

export default function ProductsScreen() {
  const dispatch    = useDispatch<AppDispatch>();
  const { items: products, isLoading } = useSelector((state: RootState) => state.products);

  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    name: '', category: '', hsnCode: '',
    gstPercentage: '18', unitType: 'KG' as Product['unitType'],
    minStockAlert: '10',
  });

  useEffect(() => { dispatch(fetchProducts()); }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchProducts());
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', category: '', hsnCode: '', gstPercentage: '18', unitType: 'KG', minStockAlert: '10' });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditTarget(p);
    setForm({
      name: p.name, category: p.category || '',
      hsnCode: p.hsnCode || '', gstPercentage: String(p.gstPercentage),
      unitType: p.unitType, minStockAlert: String(p.minStockAlert),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { return; }
    const data = {
      name: form.name, category: form.category || null,
      hsnCode: form.hsnCode || null,
      gstPercentage: Number(form.gstPercentage), unitType: form.unitType,
      minStockAlert: Number(form.minStockAlert),
    };
    if (editTarget) {
      await dispatch(editProduct({ id: editTarget.id, data }));
    } else {
      await dispatch(addProduct(data));
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Product', 'This will also remove it from stock.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeProduct(id)) },
    ]);
  };

  if (isLoading && !products.length) { return <LoadingSpinner message="Loading products..." />; }

  return (
    <View style={styles.screen}>
      {/* Search + Add */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
        ListEmptyComponent={<EmptyState icon="📦" title="No products yet" subtitle="Tap + Add to add your first product" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Text style={styles.iconText}>📦</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.metaRow}>
                  {item.category ? <Badge label={item.category} variant="info" /> : null}
                  <Badge label={item.unitType} variant="neutral" />
                  <Badge label={`GST ${item.gstPercentage}%`} variant="primary" />
                </View>
                {item.hsnCode ? <Text style={styles.meta}>HSN: {item.hsnCode}</Text> : null}
                {item.productCode ? <Text style={styles.meta}>Code: {item.productCode}</Text> : null}
                <Text style={styles.meta}>Min Stock Alert: {item.minStockAlert}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                <Text>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                <Text>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Product' : 'Add Product'}>
        <Input label="Product Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Basmati Rice" required />
        <Input label="Category" value={form.category} onChangeText={v => setForm(f => ({ ...f, category: v }))} placeholder="e.g. Grains" />
        <Input label="HSN Code" value={form.hsnCode} onChangeText={v => setForm(f => ({ ...f, hsnCode: v }))} placeholder="Optional" />
        <Input label="GST %" value={form.gstPercentage} onChangeText={v => setForm(f => ({ ...f, gstPercentage: v }))} keyboardType="numeric" />
        <Input label="Min Stock Alert" value={form.minStockAlert} onChangeText={v => setForm(f => ({ ...f, minStockAlert: v }))} keyboardType="numeric" />

        <Text style={styles.unitLabel}>Unit Type</Text>
        <View style={styles.unitGrid}>
          {UNIT_TYPES.map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.unitBtn, form.unitType === u && styles.unitBtnActive]}
              onPress={() => setForm(f => ({ ...f, unitType: u }))}
            >
              <Text style={[styles.unitText, form.unitType === u && styles.unitTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title={editTarget ? 'Update' : 'Add Product'} onPress={handleSave} fullWidth style={{ marginTop: 12 }} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#f9fafb' },
  topBar:       { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  searchInput:  { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' },
  addBtn:       { backgroundColor: '#f16a0a', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  addText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  list:         { padding: 12, paddingBottom: 32 },
  card:         { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardLeft:     { flex: 1, flexDirection: 'row', gap: 12 },
  iconBox:      { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fef7ee', alignItems: 'center', justifyContent: 'center' },
  iconText:     { fontSize: 22 },
  cardInfo:     { flex: 1, gap: 4 },
  name:         { fontSize: 15, fontWeight: '700', color: '#111827' },
  metaRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  meta:         { fontSize: 12, color: '#9ca3af' },
  actions:      { gap: 6 },
  editBtn:      { width: 36, height: 36, backgroundColor: '#fef3c7', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteBtn:    { width: 36, height: 36, backgroundColor: '#fee2e2', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unitLabel:    { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  unitGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  unitBtn:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb' },
  unitBtnActive:{ borderColor: '#f16a0a', backgroundColor: '#fef7ee' },
  unitText:     { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  unitTextActive:{ color: '#f16a0a' },
});
