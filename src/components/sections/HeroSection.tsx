import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types';

const { width: SCREEN_W } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<RootStackParamList>;

const STATS = [
  { icon: '📊', label: 'Real-time Analytics' },
  { icon: '🔒', label: 'Secure & Reliable' },
  { icon: '⚡', label: 'Lightning Fast' },
];

const DASHBOARD_STATS = [
  { label: 'Total Revenue', value: '₹2.4M', change: '+12%', color: '#22c55e' },
  { label: 'Active Users',  value: '15.2K', change: '+8%',  color: '#3b82f6' },
  { label: 'Orders',        value: '3,847', change: '+24%', color: '#8b5cf6' },
  { label: 'Growth Rate',   value: '18.5%', change: '+5%',  color: '#f16a0a' },
];

const ACTIVITIES = [
  { action: 'New order',         time: '2s ago',  color: '#22c55e' },
  { action: 'Payment received',  time: '5s ago',  color: '#3b82f6' },
  { action: 'User registered',   time: '12s ago', color: '#8b5cf6' },
  { action: 'Inventory updated', time: '18s ago', color: '#f16a0a' },
];

export default function HeroSection() {
  const navigation = useNavigation<Nav>();
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;
  const floatAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.section}>
      {/* Text Content */}
      <Animated.View style={[styles.textContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Stars */}
        <View style={styles.starsRow}>
          {[...Array(5)].map((_, i) => (
            <Text key={i} style={styles.star}>⭐</Text>
          ))}
          <Text style={styles.trustText}>Trusted by 10,000+ businesses</Text>
        </View>

        <Text style={styles.heading}>
          Transform Your{' '}
          <Text style={styles.headingGradient}>Business</Text>{' '}
          Operations
        </Text>

        <Text style={styles.subText}>
          Complete business management solution with powerful analytics,
          inventory tracking, and customer relationship tools.
        </Text>

        {/* CTA Buttons */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Start Free Trial →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.75}>
            <Text style={styles.outlineBtnText}>Watch Demo</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Pills */}
        <View style={styles.pillsRow}>
          {STATS.map(s => (
            <View key={s.label} style={styles.pill}>
              <Text style={styles.pillIcon}>{s.icon}</Text>
              <Text style={styles.pillText}>{s.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Dashboard Preview Card */}
      <Animated.View style={[styles.dashCard, { transform: [{ translateY: floatAnim }] }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardLogoWrap}>
            <View style={styles.cardLogo}>
              <Text style={styles.cardLogoText}>BA</Text>
            </View>
            <View>
              <Text style={styles.cardTitle}>Business Analytics</Text>
              <Text style={styles.cardSubtitle}>Real-time Intelligence</Text>
            </View>
          </View>
          <View style={styles.liveDot} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {DASHBOARD_STATS.map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <View style={styles.statTop}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <View style={[styles.changeBadge, { backgroundColor: stat.color + '22' }]}>
                  <Text style={[styles.changeText, { color: stat.color }]}>{stat.change}</Text>
                </View>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Chart Mockup */}
        <View style={styles.chartWrap}>
          <Text style={styles.chartTitle}>Sales Analytics</Text>
          <View style={styles.chartBars}>
            {[60, 80, 45, 95, 70, 85, 100].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.chartBar,
                  {
                    height: h * 0.6,
                    backgroundColor: i === 6
                      ? '#f16a0a'
                      : `rgba(241,106,10,${0.3 + i * 0.08})`,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Live Activity */}
        <View style={styles.activityWrap}>
          <Text style={styles.activityTitle}>🟢 Live Activity</Text>
          {ACTIVITIES.map((a, i) => (
            <View key={i} style={styles.activityRow}>
              <View style={[styles.activityDot, { backgroundColor: a.color }]} />
              <Text style={styles.activityText}>{a.action}</Text>
              <Text style={styles.activityTime}>{a.time}</Text>
            </View>
          ))}
        </View>

        {/* Performance Score */}
        <View style={styles.scoreWrap}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>94%</Text>
          </View>
          <Text style={styles.scoreLabel}>Performance Score</Text>
          <View style={[styles.changeBadge, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.changeText, { color: '#16a34a' }]}>🚀 Excellent</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  section:         { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  textContent:     { marginBottom: 24 },
  starsRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 2 },
  star:            { fontSize: 14 },
  trustText:       { fontSize: 13, color: '#6b7280', fontWeight: '500', marginLeft: 6 },
  heading:         { fontSize: 32, fontWeight: '800', color: '#111827', lineHeight: 40, marginBottom: 14 },
  headingGradient: { color: '#f16a0a' },
  subText:         { fontSize: 15, color: '#6b7280', lineHeight: 24, marginBottom: 24 },
  ctaRow:          { flexDirection: 'row', gap: 12, marginBottom: 24 },
  primaryBtn:      { flex: 1, backgroundColor: '#f16a0a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', elevation: 4, shadowColor: '#f16a0a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  primaryBtnText:  { color: '#fff', fontWeight: '800', fontSize: 15 },
  outlineBtn:      { flex: 1, borderWidth: 2, borderColor: '#d1d5db', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  outlineBtnText:  { color: '#374151', fontWeight: '700', fontSize: 15 },
  pillsRow:        { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  pill:            { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f9fafb', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  pillIcon:        { fontSize: 14 },
  pillText:        { fontSize: 12, fontWeight: '600', color: '#374151' },

  // Dashboard Card
  dashCard:        { backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16 },
  cardHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  cardLogoWrap:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLogo:        { width: 36, height: 36, borderRadius: 9, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  cardLogoText:    { color: '#fff', fontWeight: '800', fontSize: 14 },
  cardTitle:       { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  cardSubtitle:    { fontSize: 11, color: '#9ca3af' },
  liveDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  statsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statCard:        { flex: 1, minWidth: '45%', backgroundColor: '#ffffff', borderRadius: 10, padding: 10, elevation: 2 },
  statTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  statValue:       { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  changeBadge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  changeText:      { fontSize: 11, fontWeight: '700' },
  statLabel:       { fontSize: 10, color: '#9ca3af', fontWeight: '500' },

  // Chart
  chartWrap:       { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  chartTitle:      { fontSize: 13, fontWeight: '700', color: '#1f2937', marginBottom: 10 },
  chartBars:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 60 },
  chartBar:        { flex: 1, borderRadius: 4, minHeight: 4 },

  // Activity
  activityWrap:    { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  activityTitle:   { fontSize: 12, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  activityRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  activityDot:     { width: 8, height: 8, borderRadius: 4 },
  activityText:    { flex: 1, fontSize: 12, color: '#374151' },
  activityTime:    { fontSize: 11, color: '#9ca3af' },

  // Score
  scoreWrap:       { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2 },
  scoreCircle:     { width: 64, height: 64, borderRadius: 32, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  scoreValue:      { color: '#fff', fontSize: 18, fontWeight: '800' },
  scoreLabel:      { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
});
