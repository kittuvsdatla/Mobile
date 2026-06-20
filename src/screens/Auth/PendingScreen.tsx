import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';

export default function PendingScreen() {
  const dispatch   = useDispatch<AppDispatch>();
  const handleBack = async () => { await dispatch(logoutUser()); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>Account Pending Approval</Text>
        <Text style={styles.message}>
          Your business account is currently under review by our team.
          You'll receive a notification once your account is approved.
          This typically takes 24-48 hours.
        </Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 What happens next?</Text>
          <Text style={styles.infoItem}>• Our team will verify your business details</Text>
          <Text style={styles.infoItem}>• You'll receive an SMS once approved</Text>
          <Text style={styles.infoItem}>• Log in again after approval</Text>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon:      { fontSize: 80, marginBottom: 24 },
  title:     { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 16 },
  message:   { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  infoCard:  { backgroundColor: '#fef9c3', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#92400e', marginBottom: 12 },
  infoItem:  { fontSize: 13, color: '#78350f', marginBottom: 6, lineHeight: 20 },
  backBtn:   { paddingVertical: 12, paddingHorizontal: 24 },
  backText:  { fontSize: 15, color: '#f16a0a', fontWeight: '700' },
});
