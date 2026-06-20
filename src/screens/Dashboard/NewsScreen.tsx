import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

const NEWS = [
  {
    id: '1',
    date: '14 Jun 2025',
    tag: '📢 Announcement',
    title: 'BusinessApp 2.0 Mobile is Here!',
    body: 'We are thrilled to announce the release of our new mobile application. Manage your entire business from your phone — sales, purchases, inventory, reports, and more.',
    color: '#dbeafe',
    textColor: '#1d4ed8',
  },
  {
    id: '2',
    date: '10 Jun 2025',
    tag: '📦 Feature Update',
    title: 'Enhanced Stock Management',
    body: 'New automated low-stock alerts will notify you when products need restocking. Configure alert thresholds per product in the Products section.',
    color: '#dcfce7',
    textColor: '#16a34a',
  },
  {
    id: '3',
    date: '05 Jun 2025',
    tag: '💰 Financial Update',
    title: 'GST E-invoicing Support',
    body: 'We now fully support GST E-invoicing standards. Your invoices are automatically formatted for compliance. Download PDF invoices for your records.',
    color: '#fef9c3',
    textColor: '#ca8a04',
  },
  {
    id: '4',
    date: '01 Jun 2025',
    tag: '🌾 Paddy Season',
    title: 'Kharif Season Procurement Tips',
    body: 'As the Kharif paddy season approaches, ensure your inventory is stocked and suppliers are registered in the system for seamless procurement management.',
    color: '#fef3c7',
    textColor: '#d97706',
  },
  {
    id: '5',
    date: '28 May 2025',
    tag: '🔒 Security',
    title: 'PIN Authentication Improvements',
    body: 'We have improved our PIN authentication system with stronger encryption and faster unlock times for better security and user experience.',
    color: '#f3e8ff',
    textColor: '#9333ea',
  },
];

export default function NewsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>📰 News & Updates</Text>
      <Text style={styles.pageSubtitle}>Stay up to date with the latest BusinessApp features and business insights.</Text>

      {NEWS.map(item => (
        <View key={item.id} style={styles.card}>
          <View style={[styles.tagRow, { backgroundColor: item.color }]}>
            <Text style={[styles.tag, { color: item.textColor }]}>{item.tag}</Text>
            <Text style={styles.date}>{item.date}</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#f9fafb' },
  content:      { padding: 16, paddingBottom: 32 },
  pageTitle:    { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  pageSubtitle: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 24 },
  card:         { backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  tagRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  tag:          { fontSize: 13, fontWeight: '700' },
  date:         { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  cardBody:     { padding: 16 },
  title:        { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 10 },
  body:         { fontSize: 14, color: '#6b7280', lineHeight: 22 },
});
