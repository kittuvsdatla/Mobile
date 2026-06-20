import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#16a34a' },
  warning: { bg: '#fef9c3', text: '#ca8a04' },
  danger:  { bg: '#fee2e2', text: '#dc2626' },
  info:    { bg: '#dbeafe', text: '#1d4ed8' },
  neutral: { bg: '#f3f4f6', text: '#6b7280' },
  primary: { bg: '#fef7ee', text: '#f16a0a' },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral', style }) => {
  const colors = COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  text:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
