import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/types';
import type { RootState, AppDispatch } from '@/store';
import { signupUser } from '@/store/slices/authSlice';
import { apiService } from '@/services/apiService';
import { Input }  from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { COLORS, RADIUS, SHADOWS } from '@/styles/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const dispatch   = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [step, setStep] = useState(1); // 1=basic, 2=business, 3=pin

  const [form, setForm] = useState({
    fullName:    '',
    companyName: '',
    address:     '',
    phone:       route.params?.phone || '',
    email:       '',
    gstNumber:   '',
    panNumber:   '',
    pin:         '',
    confirmPin:  '',
  });
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    apiService.getPlans().then(res => {
      if (res.data) { setPlans(res.data); }
    });
  }, []);

  const update = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFormError(null);
  };

  const validateStep1 = () => {
    if (!form.fullName.trim())    { setFormError('Full name is required'); return false; }
    if (form.phone.length < 10)   { setFormError('Valid phone number required'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!form.companyName.trim()) { setFormError('Company name is required'); return false; }
    if (!form.address.trim())     { setFormError('Address is required'); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (form.pin.length !== 4)    { setFormError('PIN must be 4 digits'); return false; }
    if (form.pin !== form.confirmPin) { setFormError('PINs do not match'); return false; }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) { return; }
    if (step === 2 && !validateStep2()) { return; }
    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) { return; }
    try {
      await dispatch(signupUser({
        fullName:    form.fullName,
        companyName: form.companyName,
        address:     form.address,
        phone:       form.phone,
        email:       form.email || undefined,
        gstNumber:   form.gstNumber || undefined,
        panNumber:   form.panNumber || undefined,
        planId:      selectedPlan || undefined,
        pin:         form.pin,
      })).unwrap();
      // AppNavigator handles redirect
    } catch (err: any) {
      setFormError(typeof err === 'string' ? err : 'Signup failed. Please try again.');
    }
  };

  const displayError = formError || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kv}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}><Text style={styles.logoText}>B</Text></View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Register your business on BusinessApp</Text>
          </View>

          {/* Step Indicator */}
          <View style={styles.stepRow}>
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
                  <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>{s}</Text>
                </View>
                {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
              </React.Fragment>
            ))}
          </View>
          <View style={styles.stepLabels}>
            {['Personal', 'Business', 'Security'].map((label, i) => (
              <Text key={label} style={[styles.stepLabel, step === i + 1 && styles.stepLabelActive]}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.form}>
            {displayError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {displayError}</Text>
              </View>
            ) : null}

            {/* Step 1: Personal */}
            {step === 1 && (
              <>
                <Input label="Full Name" placeholder="Your full name" value={form.fullName} onChangeText={v => update('fullName', v)} leftIcon="👤" required />
                <Input label="Phone Number" placeholder="10-digit phone" value={form.phone} onChangeText={v => update('phone', v.replace(/\D/g, '').slice(0, 10))} keyboardType="phone-pad" leftIcon="📞" required />
                <Input label="Email (optional)" placeholder="your@email.com" value={form.email} onChangeText={v => update('email', v)} keyboardType="email-address" leftIcon="✉️" autoCapitalize="none" />
              </>
            )}

            {/* Step 2: Business */}
            {step === 2 && (
              <>
                <Input label="Company Name" placeholder="Your company name" value={form.companyName} onChangeText={v => update('companyName', v)} leftIcon="🏢" required />
                <Input label="Business Address" placeholder="Full address" value={form.address} onChangeText={v => update('address', v)} leftIcon="📍" required multiline />
                <Input label="GST Number (optional)" placeholder="GST123456789" value={form.gstNumber} onChangeText={v => update('gstNumber', v)} leftIcon="🏛" autoCapitalize="characters" />
                <Input label="PAN Number (optional)" placeholder="ABCDE1234F" value={form.panNumber} onChangeText={v => update('panNumber', v)} leftIcon="🪪" autoCapitalize="characters" />

                {plans.length > 0 && (
                  <View style={styles.planSection}>
                    <Text style={styles.planLabel}>Select Plan</Text>
                    {plans.map(plan => (
                      <TouchableOpacity
                        key={plan.id}
                        style={[styles.planCard, selectedPlan === plan.id && styles.planCardActive]}
                        onPress={() => setSelectedPlan(plan.id)}
                      >
                        <Text style={[styles.planName, selectedPlan === plan.id && styles.planNameActive]}>{plan.name}</Text>
                        <Text style={styles.planPrice}>₹{plan.price} / {plan.durationDays} days</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Step 3: Security */}
            {step === 3 && (
              <>
                <Text style={styles.pinHint}>
                  Create a 4-digit PIN to secure your account. You'll use this PIN to unlock the app.
                </Text>
                <Input label="Create PIN" placeholder="4-digit PIN" value={form.pin} onChangeText={v => update('pin', v.replace(/\D/g, '').slice(0, 4))} keyboardType="numeric" secureTextEntry leftIcon="🔒" required maxLength={4} />
                <Input label="Confirm PIN" placeholder="Re-enter 4-digit PIN" value={form.confirmPin} onChangeText={v => update('confirmPin', v.replace(/\D/g, '').slice(0, 4))} keyboardType="numeric" secureTextEntry leftIcon="🔒" required maxLength={4} />
              </>
            )}

            {/* Navigation */}
            <View style={styles.btnRow}>
              {step > 1 && (
                <Button title="Back" onPress={() => setStep(step - 1)} variant="neutral" style={styles.backBtn} />
              )}
              {step < 3 ? (
                <Button title="Continue" onPress={handleNext} style={styles.nextBtn} />
              ) : (
                <Button title={isLoading ? 'Registering...' : 'Create Account'} onPress={handleSubmit} loading={isLoading} style={styles.nextBtn} />
              )}
            </View>

            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>Already have an account? Login →</Text>
            </TouchableOpacity>
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
  header:         { backgroundColor: COLORS.dark, paddingTop: 56, paddingBottom: 40, alignItems: 'center', paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logoCircle:     { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  logoText:       { color: COLORS.surface, fontSize: 32, fontWeight: '900' },
  title:          { fontSize: 28, fontWeight: '900', color: COLORS.surface, marginBottom: 8, letterSpacing: -0.5 },
  subtitle:       { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  stepRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 40 },
  stepCircle:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive:{ backgroundColor: COLORS.primary },
  stepNum:        { fontSize: 15, fontWeight: '700', color: '#64748b' },
  stepNumActive:  { color: '#ffffff' },
  stepLine:       { flex: 1, height: 3, backgroundColor: '#e2e8f0', marginHorizontal: 8, borderRadius: 1.5 },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepLabels:     { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 20, marginBottom: 12 },
  stepLabel:      { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  stepLabelActive:{ color: COLORS.primary, fontWeight: '800' },

  form:           { padding: 24 },
  errorBox:       { backgroundColor: COLORS.dangerLight, borderWidth: 1, borderColor: '#fecaca', borderRadius: RADIUS.lg, padding: 12, marginBottom: 16 },
  errorText:      { fontSize: 13, color: COLORS.danger, fontWeight: '600' },

  pinHint:        { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, backgroundColor: COLORS.infoLight, borderRadius: RADIUS.lg, padding: 14, marginBottom: 16 },
  planSection:    { marginBottom: 8 },
  planLabel:      { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  planCard:       { borderWidth: 2, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: 16, marginBottom: 12, backgroundColor: COLORS.surface },
  planCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  planName:       { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  planNameActive: { color: COLORS.primary },
  planPrice:      { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },

  btnRow:         { flexDirection: 'row', gap: 12, marginTop: 16 },
  backBtn:        { flex: 1 },
  nextBtn:        { flex: 2 },

  loginLink:      { alignItems: 'center', paddingVertical: 20, marginTop: 16 },
  loginLinkText:  { fontSize: 15, color: COLORS.primary, fontWeight: '700' },
});
