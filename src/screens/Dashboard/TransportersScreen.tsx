import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchTransporters, addTransporter, editTransporter, removeTransporter } from '@/store/slices/transportersSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState }     from '@/components/ui/EmptyState';
import { Modal }          from '@/components/ui/Modal';
import { Input }          from '@/components/ui/Input';
import { Button }         from '@/components/ui/Button';
import type { Transporter } from '@/types';

export default function TransportersScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading } = useSelector((state: RootState) => state.transporters);
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Transporter | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', vehicleNumber: '', address: '' });

  useEffect(() => { dispatch(fetchTransporters()); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchTransporters());
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', phone: '', vehicleNumber: '', address: '' });
    setShowModal(true);
  };

  const openEdit = (t: Transporter) => {
    setEditTarget(t);
    setForm({ name: t.name, phone: t.phone || '', vehicleNumber: t.vehicleNumber || '', address: t.address || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { return; }
    if (editTarget) {
      await dispatch(editTransporter({ id: editTarget.id, data: form }));
    } else {
      await dispatch(addTransporter(form));
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transporter', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(removeTransporter(id)) },
    ]);
  };

  if (isLoading && !items.length) { return <LoadingSpinner message="Loading transporters..." />; }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.count}>{items.length} Transporters</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
        ListEmptyComponent={<EmptyState icon="🚛" title="No transporters yet" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Text style={styles.icon}>🚛</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phone       ? <Text style={styles.meta}>📞 {item.phone}</Text>       : null}
                {item.vehicleNumber ? <Text style={styles.meta}>🚗 {item.vehicleNumber}</Text> : null}
                {item.address     ? <Text style={styles.meta} numberOfLines={1}>📍 {item.address}</Text> : null}
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

      <Modal visible={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Transporter' : 'Add Transporter'}>
        <Input label="Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="Transporter name" required />
        <Input label="Phone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="Phone number" keyboardType="phone-pad" leftIcon="📞" />
        <Input label="Vehicle Number" value={form.vehicleNumber} onChangeText={v => setForm(f => ({ ...f, vehicleNumber: v }))} placeholder="e.g. AP39 AB 1234" autoCapitalize="characters" leftIcon="🚗" />
        <Input label="Address" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} placeholder="Address" multiline />
        <Button title={editTarget ? 'Update' : 'Add Transporter'} onPress={handleSave} fullWidth style={{ marginTop: 8 }} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: '#f9fafb' },
  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  count:     { fontSize: 15, fontWeight: '700', color: '#374151' },
  addBtn:    { backgroundColor: '#f16a0a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  addText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
  list:      { padding: 12, paddingBottom: 32 },
  card:      { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  cardLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:   { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fef7ee', alignItems: 'center', justifyContent: 'center' },
  icon:      { fontSize: 22 },
  info:      { flex: 1, gap: 4 },
  name:      { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta:      { fontSize: 13, color: '#6b7280' },
  actions:   { gap: 6 },
  editBtn:   { width: 36, height: 36, backgroundColor: '#fef3c7', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 36, height: 36, backgroundColor: '#fee2e2', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
