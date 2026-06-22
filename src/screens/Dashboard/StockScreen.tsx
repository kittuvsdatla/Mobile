import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput, RefreshControl,
  TouchableOpacity, Platform, StatusBar, Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchStock, fetchLowAlerts } from '@/store/slices/stockSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { StockItem } from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:     '#0f172a',
  navyMid:  '#1e293b',
  bg:       '#f1f5f9',
  surface:  '#ffffff',
  primary:  '#6366f1',
  primaryDk:'#4f46e5',
  primaryBg:'#eef2ff',
  rose:     '#f43f5e',
  roseBg:   '#fff1f2',
  amber:    '#f59e0b',
  emerald:  '#10b981',
  emeraldBg:'#ecfdf5',
  t1:       '#0f172a',
  t2:       '#334155',
  t3:       '#64748b',
  t4:       '#94a3b8',
  bdr:      '#e2e8f0',
  bdrL:     '#f1f5f9',
};

const { width } = Dimensions.get('window');

export default function StockScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { items, lowStockAlerts, isLoading } = useSelector((state: RootState) => state.stock);
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);



  const filtered = items.filter(s =>
    s.product.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.product.category?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([dispatch(fetchStock()), dispatch(fetchLowAlerts())]);
    setRefreshing(false);
  };

  const isLow = (item: StockItem) => item.quantity <= item.product.minStockAlert;

  if (isLoading && !items.length) { 
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, justifyContent: 'center' }}>
        <LoadingSpinner message="Loading stock..." />
      </View>
    ); 
  }

  const renderEmpty = () => (
    <View style={S.emptyBox}>
      <Text style={S.emptyIcon}>📦</Text>
      <Text style={S.emptyTitle}>No Stock Found</Text>
      <Text style={S.emptySub}>Try adjusting your search or add new products.</Text>
    </View>
  );

  const totalProducts = items.length;
  const lowStockCount = lowStockAlerts.length;

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Translucent status bar so the linear gradient flows underneath it */}
      <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />
      
      {/* Header — Solid Navy matching PartiesScreen */}
      <View style={[S.headerGrad, { paddingTop: insets.top + 16, backgroundColor: T.navy }]}>
        
        {/* Restored the title and subtitle */}
        <View style={S.headerContent}>
          <View>
            <Text style={S.headerTitle}>Stock</Text>
            <Text style={S.headerSub}>Manage your warehouse stock</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={S.searchBox}>
          <Text style={S.searchIcon}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search by product name or category..."
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
          <Text style={S.statLbl}>Total Products</Text>
          <Text style={S.statVal}>{totalProducts}</Text>
        </View>
        <View style={[S.statCard, { borderLeftWidth: 1, borderLeftColor: T.bdrL }]}>
          <Text style={S.statLbl}>Low Stock Alerts</Text>
          <Text style={[S.statVal, { color: T.rose }]}>{lowStockCount}</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={S.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => {
          const low = isLow(item);
          return (
            <View style={S.card}>
              {/* Top Row: Info */}
              <View style={S.cardTop}>
                <View style={[S.avatar, { backgroundColor: low ? T.roseBg : T.primaryBg }]}>
                  <Text style={S.avatarTxt}>📦</Text>
                </View>
                <View style={S.infoWrap}>
                  <Text style={S.name} numberOfLines={1}>{item.product.name}</Text>
                  {item.product.category ? (
                    <Text style={S.category}>{item.product.category}</Text>
                  ) : null}
                </View>
                <View style={S.qtyWrap}>
                  <Text style={[S.qty, low && { color: T.rose }]}>{item.quantity}</Text>
                  <Text style={S.unit}>{item.product.unitType}</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={S.cardDivider} />

              {/* Bottom Row: Status */}
              <View style={S.cardBot}>
                {low ? (
                  <View style={[S.badge, { backgroundColor: T.roseBg }]}>
                    <Text style={[S.badgeTxt, { color: T.rose }]}>Low Stock</Text>
                  </View>
                ) : (
                  <View style={[S.badge, { backgroundColor: T.emeraldBg }]}>
                    <Text style={[S.badgeTxt, { color: T.emerald }]}>In Stock</Text>
                  </View>
                )}
                
                {item.product.productCode ? (
                  <Text style={S.botTxt}>Code: {item.product.productCode}</Text>
                ) : null}
                <View style={{ flex: 1 }} />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const S = StyleSheet.create({
  // Increased paddingBottom so the curves are not hidden by the overlapping StatsRow
  headerGrad:   { paddingHorizontal: 20, paddingBottom: 68, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle:  { fontSize: 26, fontWeight: '800', color: T.surface, letterSpacing: -0.5 },
  headerSub:    { fontSize: 14, color: '#cbd5e1', marginTop: 4 },
  
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
  name:         { fontSize: 16, fontWeight: '700', color: T.t1, marginBottom: 2 },
  category:     { fontSize: 13, color: T.t3, fontWeight: '500' },
  qtyWrap:      { alignItems: 'flex-end' },
  qty:          { fontSize: 22, fontWeight: '800', color: T.emerald },
  unit:         { fontSize: 12, color: T.t4, fontWeight: '600', marginTop: -2 },
  
  cardDivider:  { height: 1, backgroundColor: T.bdrL, marginVertical: 12 },
  cardBot:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt:     { fontSize: 11, fontWeight: '700' },
  botTxt:       { fontSize: 12, color: T.t3, fontWeight: '500' },
});
