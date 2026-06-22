/**
 * LandingScreen — Blinkit/Zepto-inspired marketing page
 */
import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types';
import { COLORS, RADIUS, SHADOWS } from '@/styles/theme';

const { width } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FEATURES = [
  { icon: '💰', label: 'Sales & Invoices',   color: '#f16a0a' },
  { icon: '🛒', label: 'Purchase Tracking',  color: '#2563eb' },
  { icon: '📦', label: 'Inventory Mgmt',     color: '#8b5cf6' },
  { icon: '👥', label: 'Party Management',   color: '#0daada' },
  { icon: '📊', label: 'Reports & Ledger',   color: '#22c55e' },
  { icon: '💳', label: 'Dues & Collections', color: '#ef4444' },
  { icon: '🚛', label: 'Transport Records',  color: '#f59e0b' },
  { icon: '📰', label: 'Live Business News', color: '#84cc16' },
];

const STATS = [
  { value: '500+', label: 'Businesses' },
  { value: '₹50Cr+', label: 'Tracked' },
  { value: '99.9%', label: 'Uptime' },
];

export default function LandingScreen() {
  const navigation = useNavigation<Nav>();
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
    return () => { StatusBar.setBarStyle('dark-content'); };
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} translucent />
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Hero */}
        <View style={styles.hero}>
          {/* Logo */}
          <Animated.View style={[styles.heroContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoLetter}>B</Text>
              </View>
              <Text style={styles.logoText}>BusinessApp</Text>
            </View>

            <Text style={styles.heroTitle}>
              Manage your{'\n'}business{' '}
              <Text style={styles.heroAccent}>smarter.</Text>
            </Text>
            <Text style={styles.heroSub}>
              Sales • Purchases • Inventory • Reports{'\n'}All in one powerful platform
            </Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              {STATS.map(s => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Feature grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Everything you need</Text>
          <View style={styles.featureGrid}>
            {FEATURES.map(f => (
              <View key={f.label} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: f.color + '20' }]}>
                  <Text style={styles.featureEmoji}>{f.icon}</Text>
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Highlight strip */}
        <View style={styles.strip}>
          <Text style={styles.stripTitle}>Trusted by 500+ businesses</Text>
          <Text style={styles.stripSub}>From paddy shops to full CRM setups — BusinessApp scales with you.</Text>
        </View>

        {/* CTAs */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Login to Dashboard →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Auth', { screen: 'Signup' } as any)}
            activeOpacity={0.88}
          >
            <Text style={styles.secondaryBtnText}>Register your business</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  hero: {
    backgroundColor: COLORS.dark,
    paddingTop: 64,
    paddingBottom: 36,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {},
  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoCircle:{ width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  logoLetter:{ fontSize: 20, fontWeight: '900', color: '#fff' },
  logoText:  { fontSize: 22, fontWeight: '800', color: '#ffffff' },

  heroTitle: { fontSize: 40, fontWeight: '900', color: '#ffffff', lineHeight: 48, letterSpacing: -1, marginBottom: 14 },
  heroAccent:{ color: COLORS.primary },
  heroSub:   { fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 22, marginBottom: 32 },

  statsRow:  { flexDirection: 'row', gap: 0 },
  statItem:  { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: RADIUS.lg, paddingVertical: 14, marginHorizontal: 4 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#ffffff', marginBottom: 3 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  section:      { padding: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 16 },
  featureGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureCard:  { width: '47.5%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, alignItems: 'center', ...SHADOWS.sm },
  featureIcon:  { width: 52, height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featureEmoji: { fontSize: 26 },
  featureLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },

  strip:      { backgroundColor: COLORS.primary, marginHorizontal: 16, borderRadius: RADIUS.xl, padding: 24, marginBottom: 8 },
  stripTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  stripSub:   { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 21 },

  ctaSection:     { padding: 24, gap: 12 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    alignItems: 'center',
    ...SHADOWS.green,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '800', color: '#ffffff', letterSpacing: 0.2 },
  secondaryBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  secondaryBtnText: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  termsText: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginTop: 8 },
});
