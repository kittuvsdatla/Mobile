import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

const VARIANT_STYLES: Record<Variant, { btn: ViewStyle; txt: TextStyle }> = {
  primary:   { btn: { backgroundColor: '#f16a0a' },                     txt: { color: '#ffffff' } },
  secondary: { btn: { backgroundColor: '#22c55e' },                     txt: { color: '#ffffff' } },
  outline:   { btn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#f16a0a' }, txt: { color: '#f16a0a' } },
  ghost:     { btn: { backgroundColor: 'transparent' },                  txt: { color: '#f16a0a' } },
  danger:    { btn: { backgroundColor: '#ef4444' },                      txt: { color: '#ffffff' } },
};

const SIZE_STYLES: Record<Size, { btn: ViewStyle; txt: TextStyle }> = {
  sm: { btn: { paddingVertical: 8,  paddingHorizontal: 14, borderRadius: 8 },  txt: { fontSize: 13 } },
  md: { btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 }, txt: { fontSize: 15 } },
  lg: { btn: { paddingVertical: 15, paddingHorizontal: 28, borderRadius: 12 }, txt: { fontSize: 16 } },
};

export const Button: React.FC<ButtonProps> = ({
  onPress, title, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = false,
  style, textStyle, icon,
}) => {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        v.btn, s.btn,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? '#f16a0a' : '#fff'} />
      ) : (
        <>
          {icon ? <Text style={[styles.icon]}>{icon}</Text> : null}
          <Text style={[styles.text, v.txt, s.txt, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.5 },
  text:      { fontWeight: '700', letterSpacing: 0.3 },
  icon:      { fontSize: 16, marginRight: 8 },
});
