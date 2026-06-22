import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Alert,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

const SOLUTIONS = [
  {
    id: 1,
    name: 'Inventory Management',
    price: 'Starting at ₹29,000',
    originalPrice: '₹49,000',
    rating: 4.9,
    icon: '📦',
    description: 'Complete inventory tracking with real-time stock levels and automated alerts',
    category: 'Core Module',
    features: ['Real-time tracking', 'Automated alerts', 'Multi-location support'],
    bgColor: '#3b82f6',
    specialOffer: true,
  },
  {
    id: 2,
    name: 'Customer Relations',
    price: 'Starting at ₹19,000',
    rating: 4.8,
    icon: '👥',
    description: 'Comprehensive CRM with customer profiles, interaction history, and analytics',
    category: 'Growth',
    features: ['Contact management', 'Interaction tracking', 'Customer analytics'],
    bgColor: '#8b5cf6',
    specialOffer: false,
  },
  {
    id: 3,
    name: 'Financial Analytics',
    price: 'Starting at ₹39,000',
    rating: 4.7,
    icon: '📊',
    description: 'Advanced reporting and analytics for revenue, expenses, and profitability',
    category: 'Analytics',
    features: ['Real-time reports', 'Profit analysis', 'Custom dashboards'],
    bgColor: '#22c55e',
    specialOffer: false,
  },
  {
    id: 4,
    name: 'Payment Processing',
    price: 'Starting at ₹25,000',
    rating: 4.9,
    icon: '💳',
    description: 'Secure payment processing with multiple gateway integrations',
    category: 'Finance',
    features: ['Multiple gateways', 'Secure transactions', 'Payment analytics'],
    bgColor: '#f16a0a',
    specialOffer: false,
  },
  {
    id: 5,
    name: 'Sales Automation',
    price: 'Starting at ₹35,000',
    rating: 4.8,
    icon: '📈',
    description: 'Automated sales workflows with lead tracking and conversion optimization',
    category: 'Automation',
    features: ['Lead tracking', 'Sales funnels', 'Conversion analytics'],
    bgColor: '#6366f1',
    specialOffer: false,
  },
  {
    id: 6,
    name: 'Security Suite',
    price: 'Starting at ₹45,000',
    rating: 4.9,
    icon: '🔒',
    description: 'Enterprise-grade security with data encryption and access controls',
    category: 'Security',
    features: ['Data encryption', 'Access controls', 'Audit trails'],
    bgColor: '#374151',
    specialOffer: false,
  },
];

export default function ProductSlider() {
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [isAutoPlaying, setIsAutoPlaying]   = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isAutoPlaying) { return; }
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      setCurrentIndex(prev => (prev === SOLUTIONS.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const sol = SOLUTIONS[currentIndex];

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Business{' '}<Text style={styles.orange}>Solutions</Text>{' '}That Drive Growth
        </Text>
        <Text style={styles.sectionSubtitle}>
          Discover our comprehensive suite of tools designed to streamline operations.
        </Text>
      </View>

      {/* Slide Card */}
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        {/* Visual Header */}
        <View style={[styles.cardVisual, { backgroundColor: sol.bgColor }]}>
          <Text style={styles.cardIcon}>{sol.icon}</Text>
          {sol.specialOffer && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerText}>SPECIAL OFFER</Text>
            </View>
          )}
          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.particle,
                { left: `${15 + i * 13}%` as any, top: `${25 + (i % 3) * 25}%` as any },
              ]}
            />
          ))}
        </View>

        {/* Details */}
        <View style={styles.cardBody}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{sol.category}</Text>
          </View>

          <Text style={styles.solutionName}>{sol.name}</Text>
          <Text style={styles.description}>{sol.description}</Text>

          {/* Features */}
          <View style={styles.featuresList}>
            {sol.features.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[...Array(5)].map((_, i) => (
              <Text key={i} style={styles.star}>{i < Math.floor(sol.rating) ? '⭐' : '☆'}</Text>
            ))}
            <Text style={styles.ratingText}>{sol.rating} (1,245+ businesses)</Text>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{sol.price}</Text>
            {sol.originalPrice && (
              <Text style={styles.originalPrice}>{sol.originalPrice}</Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.getStartedBtn} activeOpacity={0.85} onPress={() => Alert.alert('Coming Soon', 'This feature is currently in development.')}>
              <Text style={styles.getStartedText}>→  Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.learnMoreBtn} activeOpacity={0.75} onPress={() => Alert.alert('Coming Soon', 'Detailed product documentation will be available soon.')}>
              <Text style={styles.learnMoreText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Dots Indicator */}
      <View style={styles.dotsRow}>
        {SOLUTIONS.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)} style={styles.dotBtn}>
            <View style={[
              styles.dot,
              i === currentIndex && styles.dotActive,
            ]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section:        { paddingHorizontal: 16, paddingVertical: 24, backgroundColor: '#f8fafc' },
  sectionHeader:  { marginBottom: 20 },
  sectionTitle:   { fontSize: 26, fontWeight: '800', color: '#111827', lineHeight: 34, marginBottom: 10 },
  orange:         { color: '#f16a0a' },
  sectionSubtitle:{ fontSize: 14, color: '#6b7280', lineHeight: 22 },

  card:           { backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, marginBottom: 20 },
  cardVisual:     { height: 180, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  cardIcon:       { fontSize: 72 },
  offerBadge:     { position: 'absolute', top: 12, right: 12, backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  offerText:      { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  particle:       { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },

  cardBody:       { padding: 20 },
  categoryBadge:  { backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  categoryText:   { fontSize: 12, fontWeight: '700', color: '#1d4ed8' },
  solutionName:   { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  description:    { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 14 },

  featuresList:   { marginBottom: 14, gap: 6 },
  featureRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  featureText:    { fontSize: 14, color: '#374151', fontWeight: '500' },

  ratingRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  star:           { fontSize: 14 },
  ratingText:     { fontSize: 13, color: '#6b7280', marginLeft: 4, fontWeight: '500' },

  priceRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  price:          { fontSize: 20, fontWeight: '800', color: '#f16a0a' },
  originalPrice:  { fontSize: 16, color: '#9ca3af', textDecorationLine: 'line-through' },

  actionsRow:     { flexDirection: 'row', gap: 10 },
  getStartedBtn:  { flex: 1, backgroundColor: '#f16a0a', paddingVertical: 12, borderRadius: 10, alignItems: 'center', elevation: 3 },
  getStartedText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  learnMoreBtn:   { flex: 1, borderWidth: 2, borderColor: '#f16a0a', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  learnMoreText:  { color: '#f16a0a', fontWeight: '700', fontSize: 15 },

  dotsRow:        { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dotBtn:         { padding: 4 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive:      { width: 24, backgroundColor: '#f16a0a' },
});
