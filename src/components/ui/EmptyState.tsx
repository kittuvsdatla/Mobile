import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  icon?: string;
  title: string;
  subtitle?: string;
}

export const EmptyState: React.FC<Props> = ({
  icon = '📭', title, subtitle,
}) => (
  <View style={styles.container}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  icon:      { fontSize: 56, marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: '700', color: '#374151', textAlign: 'center', marginBottom: 8 },
  subtitle:  { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
});
