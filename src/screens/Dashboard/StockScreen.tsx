import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchStock, fetchLowAlerts } from '@/store/slices/stockSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState }     from '@/components/ui/EmptyState';
import { Badge }          from '@/components/ui/Badge';
import type { StockItem } from '@/types';

export default function StockScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, lowStockAlerts, isLoading } = useSelector((state: RootState) => state.stock);
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchStock());
    dispatch(fetchLowAlerts());
  }, []);

  const filtered = items.filter(s =>
    s.product.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.product.category?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([dispatch(fetchStock()), dispatch(fetchLowAlerts())]);
    setRefreshing(false);
  };

  const isLow = (item: StockItem) =>
    item.quantity <= item.product.minStockAlert;

  if (isLoading && !items.length) { return <LoadingSpinner message="Loading stock..." />; }

  return (
    <View style={styles.screen}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{items.length}</Text>
          <Text style={styles.summaryLabel}>Total Products</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, styles.redText]}>{lowStockAlerts.length}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{items.filter(i => i.quantity > i.product.minStockAlert).length}</Text>
          <Text style={styles.summaryLabel}>Adequate</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search stock..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
        ListEmptyComponent={<EmptyState icon="🏭" title="No stock data" subtitle="Add products and create sales/purchases to see stock levels" />}
        renderItem={({ item }) => {
          const low = isLow(item);
          return (
            <View style={[styles.card, low && styles.cardLow]}>
              <View style={styles.cardLeft}>
                <View style={[styles.iconBox, { backgroundColor: low ? '#fee2e2' : '#dcfce7' }]}>
                  <Text style={styles.iconText}>📦</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  {item.product.category ? (
                    <Badge label={item.product.category} variant="info" style={{ marginTop: 4 }} />
                  ) : null}
                  {item.product.productCode ? (
                    <Text style={styles.code}>Code: {item.product.productCode}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.right}>
                <Text style={[styles.qty, low && styles.qtyLow]}>{item.quantity}</Text>
                <Text style={styles.unit}>{item.product.unitType}</Text>
                <Badge
                  label={low ? 'Low Stock' : 'OK'}
                  variant={low ? 'danger' : 'success'}
                  style={{ marginTop: 4 }}
                />
                {low && (
                  <Text style={styles.alertText}>Min: {item.product.minStockAlert}</Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#f9fafb' },
  summaryBar:   { flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  summaryItem:  { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 2 },
  redText:      { color: '#ef4444' },
  summaryLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  divider:      { width: 1, backgroundColor: '#e5e7eb' },
  searchWrap:   { padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  search:       { backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#e5e7eb', color: '#1f2937' },
  list:         { padding: 12, paddingBottom: 32 },
  card:         { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardLow:      { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  cardLeft:     { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  iconText:     { fontSize: 22 },
  info:         { flex: 1, gap: 2 },
  productName:  { fontSize: 15, fontWeight: '700', color: '#111827' },
  code:         { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  right:        { alignItems: 'flex-end', gap: 2 },
  qty:          { fontSize: 22, fontWeight: '800', color: '#22c55e' },
  qtyLow:       { color: '#ef4444' },
  unit:         { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  alertText:    { fontSize: 11, color: '#ef4444', fontWeight: '500' },
});
