/**
 * LoginScreen — Zepto-inspired OTP login
 * Green gradient header, digit OTP boxes
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, TextInput, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList, RootStackParamList } from '@/types';
import type { RootState, AppDispatch } from '@/store';
import { verifyOtp, clearError } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { COLORS, RADIUS, SHADOWS } from '@/styles/theme';

type Nav = NativeStackNavigationProp<AuthStackParamList & RootStackParamList>;

const OTP_LENGTH = 6;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const dispatch   = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);

  const [phone,      setPhone]      = useState('');
  const [otp,        setOtp]        = useState('');
  const [otpSent,    setOtpSent]    = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const otpRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { dispatch(clearError()); }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSendOtp = async () => {
    if (phone.length < 10) { shake(); return; }
    try {
      setIsChecking(true);
      setLocalError(null);

      // 1. Check if the phone exists & get status
      const res = await apiService.checkPhone(phone);
      if (res.success && res.data?.exists) {
        const status = res.data.status;
        if (status === 'pending')                           { navigation.navigate('Pending'); return; }
        if (status === 'suspended' || status === 'expired') { navigation.navigate('Expired'); return; }
      } else if (res.success && !res.data?.exists) {
        // Phone not registered, send them to register screen
        navigation.navigate('Signup', { phone });
        return;
      }

      // 2. Actually send the OTP SMS
      const otpRes = await apiService.sendOtp(phone);
      if (!otpRes.success) {
        setLocalError(otpRes.error || 'Failed to send OTP. Please try again.');
        return;
      }

      // 3. Show OTP input
      setOtpSent(true);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch {
      // If network fails, still show the OTP box so user can try manually
      setOtpSent(true);
    } finally { setIsChecking(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== OTP_LENGTH) { shake(); return; }
    try {
      await dispatch(verifyOtp({ phone, otp })).unwrap();
    } catch (err: any) {
      shake();
      setLocalError('Invalid OTP. Please try again.');
      if (typeof err === 'string' && err.includes('not found')) {
        navigation.navigate('Signup', { phone });
      }
    }
  };

  const displayError = error || localError;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>B</Text>
            </View>
            <Text style={styles.title}>
              {otpSent ? 'Enter OTP' : 'Welcome back'}
            </Text>
            <Text style={styles.subtitle}>
              {otpSent
                ? `We sent a 6-digit code to +91 ${phone}`
                : 'Login to your BusinessApp account'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {displayError ? (
              <Animated.View style={[styles.errorBox, { transform: [{ translateX: shakeAnim }] }]}>
                <Text style={styles.errorText}>⚠ {displayError}</Text>
              </Animated.View>
            ) : null}

            {!otpSent ? (
              /* Phone input */
              <>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.countryCode}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <Text style={styles.dialCode}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    value={phone}
                    onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                    placeholder="10-digit number"
                    placeholderTextColor={COLORS.textLight}
                    maxLength={10}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, (phone.length < 10 || isChecking) && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  activeOpacity={0.88}
                  disabled={phone.length < 10 || isChecking}
                >
                  <Text style={styles.primaryBtnText}>
                    {isChecking ? 'Checking...' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* OTP input */
              <>
                <Text style={styles.label}>Enter 6-digit OTP</Text>

                {/* OTP digit display */}
                <TouchableOpacity onPress={() => otpRef.current?.focus()} activeOpacity={1}>
                  <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.otpBox,
                          otp.length === i && styles.otpBoxActive,
                          otp.length > i && styles.otpBoxFilled,
                        ]}
                      >
                        <Text style={styles.otpDigit}>{otp[i] || ''}</Text>
                      </View>
                    ))}
                  </Animated.View>
                </TouchableOpacity>

                {/* Hidden real input */}
                <TextInput
                  ref={otpRef}
                  value={otp}
                  onChangeText={t => setOtp(t.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                  keyboardType="numeric"
                  maxLength={OTP_LENGTH}
                  style={styles.hiddenInput}
                />

                <Text style={styles.otpHint}>Dev mode: any 6-digit code works</Text>

                <TouchableOpacity
                  style={[styles.primaryBtn, (otp.length !== OTP_LENGTH || isLoading) && styles.btnDisabled]}
                  onPress={handleVerifyOtp}
                  activeOpacity={0.88}
                  disabled={otp.length !== OTP_LENGTH || isLoading}
                >
                  <Text style={styles.primaryBtnText}>
                    {isLoading ? 'Verifying...' : 'Verify & Login'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => { setOtpSent(false); setOtp(''); setLocalError(null); }}
                >
                  <Text style={styles.changeBtnText}>Change number</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>or</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity
              style={styles.signupBtn}
              onPress={() => navigation.navigate('Signup', { phone: phone || undefined })}
            >
              <Text style={styles.signupBtnText}>Register a new business</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll:    { flexGrow: 1 },

  header: {
    backgroundColor: COLORS.dark,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    borderBottomLeftRadius: RADIUS.xxl,
    borderBottomRightRadius: RADIUS.xxl,
  },
  logoCircle: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  logoText:   { fontSize: 30, fontWeight: '900', color: '#fff' },
  title:      { fontSize: 28, fontWeight: '900', color: '#ffffff', marginBottom: 8, letterSpacing: -0.5 },
  subtitle:   { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20 },

  form: { padding: 24, flex: 1 },

  errorBox:  { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: RADIUS.lg, padding: 14, marginBottom: 20 },
  errorText: { fontSize: 13, color: COLORS.danger, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  phoneRow:    { flexDirection: 'row', gap: 10, marginBottom: 24 },
  countryCode: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: COLORS.border },
  flag:        { fontSize: 20 },
  dialCode:    { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  phoneInput:  { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, borderWidth: 1.5, borderColor: COLORS.border, letterSpacing: 2 },

  otpRow: { flexDirection: 'row', gap: 8, marginBottom: 8, justifyContent: 'center' },
  otpBox: {
    width: 46, height: 56, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  otpBoxActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  otpDigit:   { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  hiddenInput:{ position: 'absolute', opacity: 0, width: 1, height: 1 },
  otpHint:    { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginBottom: 24 },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 17,
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.green,
  },
  btnDisabled:    { opacity: 0.5, elevation: 0 },
  primaryBtnText: { fontSize: 17, fontWeight: '800', color: '#ffffff', letterSpacing: 0.2 },

  changeBtn:     { alignItems: 'center', paddingVertical: 12 },
  changeBtnText: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },

  divider:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divLine:  { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  divText:  { fontSize: 13, color: COLORS.textLight, fontWeight: '500' },

  signupBtn:     { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.xl, paddingVertical: 16, alignItems: 'center' },
  signupBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
});
