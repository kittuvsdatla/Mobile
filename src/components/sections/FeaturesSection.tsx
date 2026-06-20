import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FEATURES = [
  { icon: '📊', title: 'Advanced Analytics',     description: 'Real-time business insights with comprehensive dashboards and automated reporting.', color: '#dbeafe' },
  { icon: '🛡️', title: 'Enterprise Security',    description: 'Bank-grade security with data encryption, access controls, and compliance standards.',   color: '#dcfce7' },
  { icon: '⚡',  title: 'Lightning Performance', description: 'Optimized for speed with cloud infrastructure that scales with your business needs.', color: '#fef9c3' },
  { icon: '🎧', title: '24/7 Expert Support',    description: 'Dedicated customer success team available round-the-clock to ensure your success.',  color: '#f3e8ff' },
  { icon: '☁️', title: 'Cloud Integration',       description: 'Seamless integration with popular business tools and cloud services you already use.',   color: '#ccfbf1' },
  { icon: '🔐', title: 'Data Protection',         description: 'Advanced backup systems and disaster recovery to keep your business data safe.',          color: '#fee2e2' },
];

const STATS = [
  { value: '50K+', label: 'Active Businesses' },
  { value: '25+',  label: 'Business Modules' },
  { value: '100+', label: 'Countries' },
  { value: '99.9%',label: 'Uptime' },
];

export default function FeaturesSection() {
  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          Why Choose <Text style={styles.orange}>BusinessApp</Text>?
        </Text>
        <Text style={styles.subtitle}>
          We're committed to empowering your business with cutting-edge technology,
          robust security, and exceptional support.
        </Text>
      </View>

      {/* Features Grid */}
      <View style={styles.grid}>
        {FEATURES.map((feature, i) => (
          <View key={i} style={[styles.featureCard, { backgroundColor: feature.color }]}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <Text style={styles.featureTitle}>{feature.title}</Text>
            <Text style={styles.featureDesc}>{feature.description}</Text>
          </View>
        ))}
      </View>

      {/* Stats Banner */}
      <View style={styles.statsBanner}>
        <View style={styles.statsGrid}>
          {STATS.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section:       { paddingHorizontal: 16, paddingVertical: 32 },
  header:        { marginBottom: 24, alignItems: 'center' },
  title:         { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 12, lineHeight: 34 },
  orange:        { color: '#f16a0a' },
  subtitle:      { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },

  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  featureCard:   { width: '48%', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  featureIcon:   { fontSize: 32, marginBottom: 10 },
  featureTitle:  { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  featureDesc:   { fontSize: 12, color: '#6b7280', lineHeight: 18 },

  statsBanner:   { backgroundColor: '#1d4ed8', borderRadius: 20, padding: 24 },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statItem:      { width: '45%', alignItems: 'center' },
  statValue:     { fontSize: 28, fontWeight: '800', color: '#ffffff', marginBottom: 4 },
  statLabel:     { fontSize: 12, color: '#bfdbfe', fontWeight: '500', textAlign: 'center' },
});
