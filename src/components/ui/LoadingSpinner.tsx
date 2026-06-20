import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface Props {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<Props> = ({
  message, size = 'large', color = '#f16a0a',
}) => (
  <View style={styles.container}>
    <ActivityIndicator size={size} color={color} />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  message:   { marginTop: 12, fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
