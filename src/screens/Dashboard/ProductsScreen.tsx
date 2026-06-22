import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, RefreshControl,
  TouchableOpacity, StatusBar, Alert, Animated
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchProducts, addProduct, editProduct, removeProduct } from '@/store/slices/productsSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal }          from '@/components/ui/Modal';
import { Input }          from '@/components/ui/Input';
import { Button }         from '@/components/ui/Button';
import type { Product }   from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:     '#0f172a',
  navyMid:  '#1e293b',
  bg:       '#f1f5f9',
  surface:  '#ffffff',
  primary:  '#6366f1',  // Indigo
  primaryBg:'#eef2ff',
  rose:     '#f43f5e',
  roseBg:   '#fff1f2',
  emerald:  '#10b981',
  emeraldBg:'#ecfdf5',
  amber:    '#f59e0b',
  amberBg:  '#fffbeb',
  t1:       '#0f172a',
  t2:       '#334155',
  t3:       '#64748b',
  t4:       '#94a3b8',
  bdr:      '#e2e8f0',
  bdrL:     '#f1f5f9',
};

const UNIT_TYPES: Product['unitType'][] = ['KG', 'GRAM', 'BAG', 'PIECE', 'LITRE', 'BOX'];

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const dispatch    = useDispatch<AppDispatch>();
  const { items: products, isLoading } = useSelector((state: RootState) => state.products);

  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [saving,     setSaving]     = useState(false);

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

  const [form, setForm] = useState({
    name: '', category: '', hsnCode: '',
    gstPercentage: '18', unitType: 'KG' as Product['unitType'],
    minStockAlert: '10',
  });



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
    if (!form.name.trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    
    setSaving(true);
    const data = {
      name: form.name, category: form.category || null,
      hsnCode: form.hsnCode || null,
      gstPercentage: Number(form.gstPercentage), unitType: form.unitType,
      minStockAlert: Number(form.minStockAlert),
    };
    
    try {
      if (editTarget) {
        await dispatch(editProduct({ id: editTarget.id, data }));
        setShowModal(false);
        showToast(`✓  ${form.name} updated successfully`);
      } else {
        await dispatch(addProduct(data));
        setShowModal(false);
        showToast(`✓  ${form.name} added to catalog`);
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Product', 'This will also remove it from stock.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeProduct(id)) },
    ]);
  };

  if (isLoading && !products.length) { 
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
        <LoadingSpinner message="Loading products..." />
      </View>
    ); 
  }

  const renderEmpty = () => (
    <View style={S.emptyBox}>
      <Text style={S.emptyIcon}>📦</Text>
      <Text style={S.emptyTitle}>No Products Found</Text>
      <Text style={S.emptySub}>Tap + Add to add your first product to the catalog.</Text>
    </View>
  );

  const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean)).size;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Translucent status bar so the solid header flows underneath it */}
      <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />
      
      {/* Header — Solid Navy matching StockScreen */}
      <View style={[S.headerGrad, { paddingTop: insets.top + 16, backgroundColor: T.navy }]}>
        
        {/* Title and subtitle + Add Button */}
        <View style={S.headerContent}>
          <View>
            <Text style={S.headerTitle}>Products</Text>
            <Text style={S.headerSub}>Manage your catalog</Text>
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
            placeholder="Search products or category..."
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

      {/* Stats row floating over background */}
      <View style={S.statsRow}>
        <View style={S.statCard}>
          <Text style={S.statLbl}>Total Catalog</Text>
          <Text style={S.statVal}>{products.length}</Text>
        </View>
        <View style={[S.statCard, { borderLeftWidth: 1, borderLeftColor: T.bdrL }]}>
          <Text style={S.statLbl}>Categories</Text>
          <Text style={[S.statVal, { color: T.primary }]}>{uniqueCategories}</Text>
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
            {/* Top Row: Info */}
            <View style={S.cardTop}>
              <View style={[S.avatar, { backgroundColor: T.primaryBg }]}>
                <Text style={S.avatarTxt}>📦</Text>
              </View>
              <View style={S.infoWrap}>
                <Text style={S.name} numberOfLines={1}>{item.name}</Text>
                <View style={S.metaRow}>
                  {item.category ? (
                    <View style={[S.badge, { backgroundColor: T.bg }]}><Text style={[S.badgeTxt, { color: T.t2 }]}>{item.category}</Text></View>
                  ) : null}
                  <View style={[S.badge, { backgroundColor: T.emeraldBg }]}><Text style={[S.badgeTxt, { color: T.emerald }]}>{item.unitType}</Text></View>
                  <View style={[S.badge, { backgroundColor: T.amberBg }]}><Text style={[S.badgeTxt, { color: T.amber }]}>GST {item.gstPercentage}%</Text></View>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View style={S.cardDivider} />

            {/* Bottom Row: Actions */}
            <View style={S.cardBot}>
              {item.productCode ? (
                <Text style={S.botTxt}>Code: {item.productCode}</Text>
              ) : null}
              {item.hsnCode ? (
                <Text style={[S.botTxt, item.productCode && { marginLeft: 12 }]}>HSN: {item.hsnCode}</Text>
              ) : null}
              
              <View style={{ flex: 1 }} />
              
              <TouchableOpacity style={S.actionBtn} onPress={() => openEdit(item)}>
                <Text style={S.actionBtnTxt}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.actionBtn, { backgroundColor: T.roseBg, marginLeft: 8 }]} onPress={() => handleDelete(item.id)}>
                <Text style={S.actionBtnTxt}>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Product' : 'Add Product'}>
        <Input label="Product Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Basmati Rice" required />
        <Input label="Category" value={form.category} onChangeText={v => setForm(f => ({ ...f, category: v }))} placeholder="e.g. Grains" />
        <Input label="HSN Code" value={form.hsnCode} onChangeText={v => setForm(f => ({ ...f, hsnCode: v }))} placeholder="Optional" />
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input label="GST %" value={form.gstPercentage} onChangeText={v => setForm(f => ({ ...f, gstPercentage: v }))} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Min Alert" value={form.minStockAlert} onChangeText={v => setForm(f => ({ ...f, minStockAlert: v }))} keyboardType="numeric" />
          </View>
        </View>

        <Text style={S.unitLabel}>Unit Type</Text>
        <View style={S.unitGrid}>
          {UNIT_TYPES.map(u => (
            <TouchableOpacity
              key={u}
              style={[S.unitBtn, form.unitType === u && S.unitBtnActive]}
              onPress={() => setForm(f => ({ ...f, unitType: u }))}
            >
              <Text style={[S.unitText, form.unitType === u && S.unitTextActive]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button loading={saving} title={editTarget ? 'Update' : 'Add Product'} onPress={handleSave} fullWidth style={{ marginTop: 12, backgroundColor: T.primary }} />
      </Modal>

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
  botTxt:       { fontSize: 12, color: T.t3, fontWeight: '500' },
  
  actionBtn:    { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: T.primaryBg, borderRadius: 8 },
  actionBtnTxt: { fontSize: 12, fontWeight: '600', color: T.t1 },

  unitLabel:    { fontSize: 13, fontWeight: '600', color: T.t2, marginBottom: 8, marginTop: 4 },
  unitGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  unitBtn:      { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: T.bdr },
  unitBtnActive:{ borderColor: T.primary, backgroundColor: T.primaryBg },
  unitText:     { fontSize: 13, fontWeight: '600', color: T.t3 },
  unitTextActive:{ color: T.primary },

  toast:        { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: T.navy, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, alignItems: 'center' },
  toastError:   { backgroundColor: T.rose },
  toastTxt:     { color: '#fff', fontSize: 14, fontWeight: '700' },
});
