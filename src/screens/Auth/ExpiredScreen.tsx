import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';

export default function ExpiredScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const handleBack = async () => { await dispatch(logoutUser()); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Subscription Expired</Text>
        <Text style={styles.message}>
          Your business subscription plan has expired or your account has been suspended.
          Please contact our support team to renew or resolve the issue.
        </Text>
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>📞 Contact Support</Text>
          <TouchableOpacity onPress={() => Linking.openURL('tel:+919876543210')}>
            <Text style={styles.contactItem}>+91 9876543210</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:info@businessapp.com')}>
            <Text style={styles.contactItem}>info@businessapp.com</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#ffffff' },
  content:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon:         { fontSize: 80, marginBottom: 24 },
  title:        { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 16 },
  message:      { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  contactCard:  { backgroundColor: '#fee2e2', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  contactTitle: { fontSize: 15, fontWeight: '700', color: '#991b1b', marginBottom: 12 },
  contactItem:  { fontSize: 14, color: '#dc2626', fontWeight: '600', marginBottom: 8, textDecorationLine: 'underline' },
  backBtn:      { paddingVertical: 12, paddingHorizontal: 24 },
  backText:     { fontSize: 15, color: '#f16a0a', fontWeight: '700' },
});
