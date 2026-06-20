import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { apiService }     from '@/services/apiService';
import { Input }          from '@/components/ui/Input';
import { Button }         from '@/components/ui/Button';
import { Card }           from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { SettingsData } from '@/types';

export default function SettingsScreen() {
  const { user } = useSelector((state: RootState) => state.auth);

  const [form, setForm] = useState<SettingsData>({
    companyName: '', address: '', phone: '', state: '',
    gstNumber: '', bankName: '', bankAccountNumber: '',
    bankIfscCode: '', termsAndConditions: '',
  });
  const [isLoading,  setIsLoading]  = useState(true);
  const [isSaving,   setIsSaving]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Security / PIN state
  const [currentPin,  setCurrentPin]  = useState('');
  const [newPin,      setNewPin]      = useState('');
  const [confirmPin,  setConfirmPin]  = useState('');
  const [pinMsg,      setPinMsg]      = useState({ text: '', isError: false });
  const [pinLoading,  setPinLoading]  = useState(false);

  // Forgot PIN / OTP state
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [otpSent,       setOtpSent]       = useState(false);
  const [otp,           setOtp]           = useState('');
  const [resetNewPin,   setResetNewPin]   = useState('');
  const [resetConfPin,  setResetConfPin]  = useState('');

  const loadSettings = async () => {
    try {
      const res = await apiService.getSettings();
      if (res.success && res.data) { setForm(res.data); }
    } catch { /* no-op */ } finally { setIsLoading(false); }
  };

  useEffect(() => { loadSettings(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await apiService.updateSettings(form);
      if (res.success) {
        Alert.alert('✓ Success', 'Business settings updated successfully');
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const update = (key: keyof SettingsData, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ---------- PIN Change ----------
  const handleChangePin = async () => {
    setPinMsg({ text: '', isError: false });
    if (newPin !== confirmPin) {
      setPinMsg({ text: 'New PIN and Confirm PIN do not match', isError: true }); return;
    }
    if (newPin.length !== 4 || currentPin.length !== 4) {
      setPinMsg({ text: 'PIN must be exactly 4 digits', isError: true }); return;
    }
    setPinLoading(true);
    try {
      const res = await apiService.changePin(currentPin, newPin);
      if (res.success) {
        setPinMsg({ text: 'PIN changed successfully!', isError: false });
        setCurrentPin(''); setNewPin(''); setConfirmPin('');
      } else {
        setPinMsg({ text: (res as any).error || 'Failed to change PIN', isError: true });
      }
    } catch (err: any) {
      setPinMsg({ text: err.message || 'Error changing PIN', isError: true });
    } finally {
      setPinLoading(false);
    }
  };

  // ---------- Reset PIN via OTP ----------
  const handleSendOtp = async () => {
    setPinLoading(true);
    try {
      // Dev mode: no Firebase on native — call reset-pin directly after OTP simulation
      setOtpSent(true);
      setPinMsg({ text: 'OTP sent to your registered phone number', isError: false });
    } catch (err: any) {
      setPinMsg({ text: err.message || 'Failed to send OTP', isError: true });
    } finally {
      setPinLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (resetNewPin !== resetConfPin) {
      setPinMsg({ text: 'New PIN and Confirm PIN do not match', isError: true }); return;
    }
    if (resetNewPin.length !== 4) {
      setPinMsg({ text: 'New PIN must be exactly 4 digits', isError: true }); return;
    }
    setPinLoading(true);
    try {
      // Pass OTP as the "idToken" for server-side verification
      const res = await apiService.resetPin(otp, resetNewPin);
      if (res.success) {
        setPinMsg({ text: 'PIN reset successfully!', isError: false });
        setShowForgotPin(false); setOtpSent(false);
        setOtp(''); setResetNewPin(''); setResetConfPin('');
      } else {
        setPinMsg({ text: (res as any).error || 'Failed to reset PIN', isError: true });
      }
    } catch (err: any) {
      setPinMsg({ text: err.message || 'Invalid OTP', isError: true });
    } finally {
      setPinLoading(false);
    }
  };

  if (isLoading) { return <LoadingSpinner message="Loading settings..." />; }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f16a0a" />}
      keyboardShouldPersistTaps="handled"
    >
      {/* User Info Card */}
      <Card style={styles.profileCard} padding={20}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'B'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileRole}>
              {user?.role === 'client' ? 'Business Owner' : user?.role}
            </Text>
            <Text style={styles.profilePhone}>📞 {user?.phone}</Text>
          </View>
        </View>
        {user?.entityStatus && (
          <View style={[
            styles.statusBadge,
            { backgroundColor: user.entityStatus === 'active' ? '#dcfce7' : '#fee2e2' },
          ]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: user.entityStatus === 'active' ? '#16a34a' : '#dc2626' }}>
              Account: {user.entityStatus.toUpperCase()}
            </Text>
          </View>
        )}
      </Card>

      {/* Company Information */}
      <Text style={styles.sectionTitle}>🏢 Company Information</Text>
      <Card style={styles.formCard} padding={20}>
        <Input label="Company Name"     value={form.companyName}   onChangeText={v => update('companyName', v)}   placeholder="Your company name"         leftIcon="🏢" required />
        <Input label="Business Address" value={form.address}       onChangeText={v => update('address', v)}       placeholder="Full business address"     leftIcon="📍" multiline />
        <Input label="Phone Number"     value={form.phone}         onChangeText={v => update('phone', v)}         placeholder="Business phone"            keyboardType="phone-pad" leftIcon="📞" />
        <Input label="State"            value={form.state}         onChangeText={v => update('state', v)}         placeholder="State name"                leftIcon="🗺" />
        <Input label="GST Number"       value={form.gstNumber}     onChangeText={v => update('gstNumber', v)}     placeholder="GSTIN"                     autoCapitalize="characters" leftIcon="🏛" />
      </Card>

      {/* Bank Information */}
      <Text style={styles.sectionTitle}>🏦 Bank Information</Text>
      <Card style={styles.formCard} padding={20}>
        <Input label="Bank Name"       value={form.bankName}          onChangeText={v => update('bankName', v)}          placeholder="e.g. State Bank of India" leftIcon="🏦" />
        <Input label="Account Number" value={form.bankAccountNumber} onChangeText={v => update('bankAccountNumber', v)} placeholder="Bank account number"      keyboardType="numeric" leftIcon="💳" />
        <Input label="IFSC Code"      value={form.bankIfscCode}      onChangeText={v => update('bankIfscCode', v)}      placeholder="e.g. SBIN0001234"         autoCapitalize="characters" leftIcon="🔢" />
      </Card>

      {/* Terms & Conditions */}
      <Text style={styles.sectionTitle}>📋 Invoice Terms</Text>
      <Card style={styles.formCard} padding={20}>
        <Input
          label="Terms & Conditions"
          value={form.termsAndConditions}
          onChangeText={v => update('termsAndConditions', v)}
          placeholder="Terms printed at the bottom of invoices..."
          multiline
          numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: 'top' }}
        />
      </Card>

      {/* Save Button */}
      <Button
        title={isSaving ? 'Saving...' : '✓  Save Settings'}
        onPress={handleSave}
        loading={isSaving}
        fullWidth
        size="lg"
        style={styles.saveBtn}
      />

      {/* ── Security & Login ── */}
      <Text style={styles.sectionTitle}>🔐 Security & Login</Text>
      <Card style={styles.formCard} padding={20}>
        {pinMsg.text ? (
          <View style={[styles.pinMsgBox, { backgroundColor: pinMsg.isError ? '#fee2e2' : '#dcfce7' }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: pinMsg.isError ? '#dc2626' : '#16a34a' }}>
              {pinMsg.text}
            </Text>
          </View>
        ) : null}

        {!showForgotPin ? (
          <>
            <Text style={styles.pinSubtitle}>Change Security PIN</Text>
            <Input
              label="Current PIN"
              value={currentPin}
              onChangeText={v => setCurrentPin(v.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit PIN"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              leftIcon="🔒"
            />
            <Input
              label="New PIN"
              value={newPin}
              onChangeText={v => setNewPin(v.replace(/\D/g, '').slice(0, 4))}
              placeholder="4-digit new PIN"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              leftIcon="🔑"
            />
            <Input
              label="Confirm New PIN"
              value={confirmPin}
              onChangeText={v => setConfirmPin(v.replace(/\D/g, '').slice(0, 4))}
              placeholder="Confirm new PIN"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              leftIcon="✅"
            />
            <View style={styles.pinRow}>
              <TouchableOpacity onPress={() => { setShowForgotPin(true); setPinMsg({ text: '', isError: false }); }}>
                <Text style={styles.forgotTxt}>Forgot Current PIN?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.updatePinBtn, (!currentPin || !newPin || !confirmPin) && { opacity: 0.5 }]}
                onPress={handleChangePin}
                disabled={pinLoading || !currentPin || !newPin || !confirmPin}
              >
                {pinLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.updatePinTxt}>Update PIN</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.pinSubtitle}>Reset PIN via OTP</Text>
            <Text style={styles.pinNote}>
              An OTP will be sent to your registered phone:{' '}
              <Text style={{ fontWeight: '700', color: '#1f2937' }}>{user?.phone}</Text>
            </Text>

            {!otpSent ? (
              <View style={styles.pinRow}>
                <TouchableOpacity style={styles.cancelOtpBtn} onPress={() => { setShowForgotPin(false); setPinMsg({ text: '', isError: false }); }}>
                  <Text style={styles.cancelOtpTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.updatePinBtn} onPress={handleSendOtp} disabled={pinLoading}>
                  {pinLoading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.updatePinTxt}>Send OTP</Text>
                  }
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Input
                  label="OTP (6 digits)"
                  value={otp}
                  onChangeText={v => setOtp(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter OTP"
                  keyboardType="numeric"
                  maxLength={6}
                  leftIcon="📱"
                />
                <Input
                  label="New PIN"
                  value={resetNewPin}
                  onChangeText={v => setResetNewPin(v.replace(/\D/g, '').slice(0, 4))}
                  placeholder="4-digit new PIN"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  leftIcon="🔑"
                />
                <Input
                  label="Confirm New PIN"
                  value={resetConfPin}
                  onChangeText={v => setResetConfPin(v.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Confirm new PIN"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={4}
                  leftIcon="✅"
                />
                <View style={styles.pinRow}>
                  <TouchableOpacity style={styles.cancelOtpBtn} onPress={() => { setShowForgotPin(false); setOtpSent(false); setPinMsg({ text: '', isError: false }); }}>
                    <Text style={styles.cancelOtpTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.updatePinBtn, { backgroundColor: '#16a34a' }]}
                    onPress={handleVerifyAndReset}
                    disabled={pinLoading || otp.length < 4 || !resetNewPin || !resetConfPin}
                  >
                    {pinLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.updatePinTxt}>Verify & Reset</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </Card>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>BusinessApp Mobile v1.0.0</Text>
        <Text style={styles.appInfoSub}>© 2025 BusinessApp. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#f9fafb' },
  content:      { padding: 16, paddingBottom: 48 },
  profileCard:  { marginBottom: 24, borderWidth: 1, borderColor: '#f3f4f6' },
  profileRow:   { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  avatar:       { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f16a0a', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 24, fontWeight: '800', color: '#ffffff' },
  profileInfo:  { flex: 1, gap: 3 },
  profileName:  { fontSize: 18, fontWeight: '800', color: '#111827' },
  profileRole:  { fontSize: 14, color: '#f16a0a', fontWeight: '600', textTransform: 'capitalize' },
  profilePhone: { fontSize: 13, color: '#9ca3af' },
  statusBadge:  { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 10 },
  formCard:     { marginBottom: 20, borderWidth: 1, borderColor: '#f3f4f6' },
  saveBtn:      { marginTop: 8, marginBottom: 20 },

  // PIN section
  pinMsgBox:    { borderRadius: 10, padding: 12, marginBottom: 12 },
  pinSubtitle:  { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  pinNote:      { fontSize: 14, color: '#6b7280', marginBottom: 14, lineHeight: 20 },
  pinRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  forgotTxt:    { fontSize: 14, color: '#f16a0a', fontWeight: '600' },
  updatePinBtn: { backgroundColor: '#1f2937', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  updatePinTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelOtpBtn: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  cancelOtpTxt: { color: '#6b7280', fontWeight: '600', fontSize: 14 },

  appInfo:      { alignItems: 'center', paddingVertical: 16 },
  appInfoText:  { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  appInfoSub:   { fontSize: 12, color: '#d1d5db', marginTop: 4 },
});
