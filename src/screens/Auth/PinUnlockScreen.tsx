import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Animated, KeyboardAvoidingView, Platform, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { unlockApp, logoutUser } from '@/store/slices/authSlice';
import type { RootState } from '@/store';
import { apiService } from '@/services/apiService';
import { COLORS, RADIUS, SHADOWS } from '@/styles/theme';

const PIN_LENGTH = 4;

export default function PinUnlockScreen() {
  const dispatch = useDispatch<any>();
  const user = useSelector((s: RootState) => s.auth.user);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Forgot PIN state
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<'initial'|'sending'|'otp'>('initial');
  const [resetOtp, setResetOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [resetError, setResetError] = useState<string|null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Real-time verification when PIN reaches 4 digits
  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      verifyPin(pin);
    }
  }, [pin]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const verifyPin = async (code: string) => {
    if (isVerifying) return;
    try {
      setIsVerifying(true);
      setError(null);
      
      const response = await apiService.verifyPin(code);
      if (response.success) {
        dispatch(unlockApp());
      } else {
        throw new Error(response.message || 'Incorrect PIN');
      }
    } catch (err: any) {
      shake();
      setPin('');
      setError(err.message || 'Incorrect PIN. Try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (key: string) => {
    setError(null);
    if (key === 'del') {
      setPin(prev => prev.slice(0, -1));
    } else if (pin.length < PIN_LENGTH) {
      setPin(prev => prev + key);
    }
  };

  const renderKeypadButton = (val: string) => (
    <TouchableOpacity
      key={val}
      style={styles.keyBtn}
      activeOpacity={0.7}
      onPress={() => handleKeyPress(val)}
      disabled={isVerifying}
    >
      <Text style={styles.keyTxt}>{val}</Text>
    </TouchableOpacity>
  );

  const handleForgotPin = async () => {
    if (!user?.phone) return;
    setForgotStep('sending');
    setResetError(null);
    try {
      const res = await apiService.sendOtp(user.phone);
      if (res.success) {
        setForgotStep('otp');
      } else {
        setResetError(res.message || 'Failed to send OTP');
        setForgotStep('initial');
      }
    } catch (e: any) {
      setResetError(e.message || 'Failed to send OTP');
      setForgotStep('initial');
    }
  };

  const handleResetPin = async () => {
    if (resetOtp.length !== 6 || newPin.length !== 4) {
      setResetError('Please enter 6-digit OTP and 4-digit New PIN');
      return;
    }
    setResetLoading(true);
    setResetError(null);
    try {
      const res = await apiService.resetPin(resetOtp, newPin);
      if (res.success) {
        setForgotVisible(false);
        setPin('');
        dispatch(unlockApp());
      } else {
        setResetError(res.message || 'Failed to reset PIN');
      }
    } catch (e: any) {
      setResetError(e.message || 'Failed to reset PIN');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.lockIconBox}>
            <Text style={styles.lockIconTxt}>🔒</Text>
          </View>
          <Text style={styles.title}>Unlock App</Text>
          <Text style={styles.subtitle}>Enter your 4-digit PIN</Text>
        </View>

        <View style={styles.content}>
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  pin.length > i && styles.dotFilled,
                  error && styles.dotError
                ]}
              />
            ))}
          </Animated.View>

          {error && <Text style={styles.errorTxt}>{error}</Text>}
          {isVerifying && <Text style={styles.verifyTxt}>Verifying...</Text>}

          <View style={styles.keypad}>
            <View style={styles.keyRow}>{['1', '2', '3'].map(renderKeypadButton)}</View>
            <View style={styles.keyRow}>{['4', '5', '6'].map(renderKeypadButton)}</View>
            <View style={styles.keyRow}>{['7', '8', '9'].map(renderKeypadButton)}</View>
            <View style={styles.keyRow}>
              <View style={styles.keyEmpty} />
              {renderKeypadButton('0')}
              <TouchableOpacity
                style={styles.keyBtn}
                activeOpacity={0.7}
                onPress={() => handleKeyPress('del')}
                disabled={isVerifying}
              >
                <Text style={styles.keyTxt}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.textBtn} onPress={() => dispatch(logoutUser())}>
              <Text style={styles.textBtnTxt}>Sign Out</Text>
            </TouchableOpacity>
            <View style={styles.footerDot} />
            <TouchableOpacity style={styles.textBtn} onPress={() => { setForgotVisible(true); setForgotStep('initial'); setResetOtp(''); setNewPin(''); setResetError(null); }}>
              <Text style={styles.textBtnTxt}>Forgot PIN?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot PIN Modal */}
        <Modal visible={forgotVisible} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Reset PIN</Text>
              
              {resetError ? <Text style={styles.modalError}>{resetError}</Text> : null}

              {forgotStep === 'initial' || forgotStep === 'sending' ? (
                <>
                  <Text style={styles.modalDesc}>We will send a 6-digit WhatsApp OTP to +91 {user?.phone || 'your number'}.</Text>
                  <TouchableOpacity style={styles.modalBtn} onPress={handleForgotPin} disabled={forgotStep === 'sending'}>
                    {forgotStep === 'sending' ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnTxt}>Send OTP</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalLabel}>Enter 6-digit OTP</Text>
                  <TextInput style={styles.modalInput} keyboardType="numeric" maxLength={6} value={resetOtp} onChangeText={t => setResetOtp(t.replace(/\D/g, ''))} placeholder="123456" />

                  <Text style={styles.modalLabel}>Enter New 4-digit PIN</Text>
                  <TextInput style={styles.modalInput} keyboardType="numeric" maxLength={4} secureTextEntry value={newPin} onChangeText={t => setNewPin(t.replace(/\D/g, ''))} placeholder="****" />

                  <TouchableOpacity style={styles.modalBtn} onPress={handleResetPin} disabled={resetLoading}>
                    {resetLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnTxt}>Verify & Reset PIN</Text>}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setForgotVisible(false)}>
                <Text style={styles.modalCloseTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  lockIconBox: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)'
  },
  lockIconTxt: { fontSize: 32 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.surface, marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 30 },
  
  dotsRow: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)'
  },
  dotFilled: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dotError:  { backgroundColor: COLORS.danger, borderColor: COLORS.danger },
  
  errorTxt: { color: COLORS.dangerLight, fontSize: 14, fontWeight: '600', marginBottom: 20, marginTop: -20 },
  verifyTxt: { color: COLORS.primary, fontSize: 14, fontWeight: '600', marginBottom: 20, marginTop: -20 },

  keypad: { width: '100%', maxWidth: 320, gap: 16, marginTop: 10 },
  keyRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  keyBtn: {
    width: 75, height: 75, borderRadius: 37.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  keyEmpty: { width: 75, height: 75 },
  keyTxt: { fontSize: 28, fontWeight: '600', color: COLORS.surface },

  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', marginBottom: 40, gap: 16 },
  textBtn: { padding: 12 },
  textBtnTxt: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  footerDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },

  modalCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: COLORS.dark, marginBottom: 12 },
  modalDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalError: { color: COLORS.danger, fontSize: 14, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, alignSelf: 'flex-start', marginBottom: 8, marginTop: 12 },
  modalInput: { width: '100%', height: 50, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, paddingHorizontal: 16, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  modalBtn: { width: '100%', height: 50, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  modalBtnTxt: { color: COLORS.surface, fontSize: 16, fontWeight: '700' },
  modalCloseBtn: { marginTop: 16, padding: 8 },
  modalCloseTxt: { color: COLORS.textLight, fontSize: 15, fontWeight: '600' },
});
