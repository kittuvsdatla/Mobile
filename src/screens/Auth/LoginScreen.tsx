import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList, RootStackParamList } from '@/types';
import type { RootState, AppDispatch } from '@/store';
import { verifyOtp, clearError } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { Input }  from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type Nav = NativeStackNavigationProp<AuthStackParamList & RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch   = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [phone,      setPhone]      = useState('');
  const [otp,        setOtp]        = useState('');
  const [otpSent,    setOtpSent]    = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    dispatch(clearError());
  }, []);

  const handleSendOtp = async () => {
    if (phone.length < 10) { return; }
    try {
      setIsChecking(true);
      setLocalError(null);
      const res = await apiService.checkPhone(phone);
      if (res.success && res.data) {
        if (res.data.exists) {
          const status = res.data.status;
          if (status === 'pending') {
            navigation.navigate('Pending');
            return;
          } else if (status === 'suspended' || status === 'expired') {
            navigation.navigate('Expired');
            return;
          }
        }
        // New user or active — send OTP (mock for now)
        setOtpSent(true);
      } else {
        setOtpSent(true); // Fallback
      }
    } catch {
      setOtpSent(true); // Fallback
    } finally {
      setIsChecking(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const result = await dispatch(verifyOtp({ phone, otp })).unwrap();
      // Navigation handled by AppNavigator via auth state change
    } catch (err: any) {
      setLocalError('Invalid OTP or verification failed.');
      if (typeof err === 'string' && err.includes('not found')) {
        navigation.navigate('Signup', { phone });
      }
    }
  };

  const displayError = error || localError;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kv}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Gradient */}
          <View style={styles.headerGradient}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>B</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to your BusinessApp account</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {displayError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {displayError}</Text>
              </View>
            ) : null}

            <Input
              label="Phone Number"
              placeholder="Enter 10-digit phone number"
              value={phone}
              onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              leftIcon="📞"
              editable={!otpSent}
              required
            />

            {otpSent ? (
              <>
                <Input
                  label="Enter OTP"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="numeric"
                  leftIcon="🔑"
                  maxLength={6}
                  textAlign="center"
                  required
                />
                <Text style={styles.hint}>Dev mode: any 6-digit OTP will work</Text>

                <Button
                  title={isLoading ? 'Verifying...' : 'Verify & Login'}
                  onPress={handleVerifyOtp}
                  disabled={otp.length !== 6}
                  loading={isLoading}
                  fullWidth
                  size="lg"
                  style={styles.actionBtn}
                />

                <TouchableOpacity onPress={() => setOtpSent(false)} style={styles.backBtn}>
                  <Text style={styles.backText}>← Change phone number</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Button
                title={isChecking ? 'Checking...' : 'Send OTP'}
                onPress={handleSendOtp}
                disabled={phone.length < 10}
                loading={isChecking}
                fullWidth
                size="lg"
                style={styles.actionBtn}
              />
            )}

            {/* Signup Link */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup', { phone: phone || undefined })}>
                <Text style={styles.signupLink}>Register your business →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#ffffff' },
  kv:             { flex: 1 },
  scroll:         { flexGrow: 1 },
  headerGradient: { backgroundColor: '#f16a0a', paddingTop: 60, paddingBottom: 40, alignItems: 'center', paddingHorizontal: 24 },
  logoCircle:     { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText:       { color: '#fff', fontSize: 28, fontWeight: '800' },
  title:          { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 8 },
  subtitle:       { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  form:           { padding: 24, flex: 1 },
  errorBox:       { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText:      { fontSize: 13, color: '#dc2626', fontWeight: '500' },
  hint:           { fontSize: 12, color: '#9ca3af', marginBottom: 12, marginTop: -8 },
  actionBtn:      { marginTop: 8 },
  backBtn:        { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  backText:       { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  signupRow:      { flexDirection: 'row', justifyContent: 'center', marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6', flexWrap: 'wrap' },
  signupText:     { fontSize: 14, color: '#6b7280' },
  signupLink:     { fontSize: 14, color: '#f16a0a', fontWeight: '700' },
});
