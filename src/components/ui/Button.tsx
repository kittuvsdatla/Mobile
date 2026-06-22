import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '@/styles/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'neutral';
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
  primary:   { btn: { backgroundColor: COLORS.primary },                                  txt: { color: COLORS.surface } },
  secondary: { btn: { backgroundColor: COLORS.dark },                                     txt: { color: COLORS.surface } },
  outline:   { btn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.primary }, txt: { color: COLORS.primary } },
  neutral:   { btn: { backgroundColor: COLORS.surfaceAlt },                               txt: { color: COLORS.textSecondary } },
  ghost:     { btn: { backgroundColor: 'transparent' },                                   txt: { color: COLORS.primary } },
  danger:    { btn: { backgroundColor: COLORS.danger },                                   txt: { color: COLORS.surface } },
};

const SIZE_STYLES: Record<Size, { btn: ViewStyle; txt: TextStyle }> = {
  sm: { btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.md },  txt: { fontSize: 13 } },
  md: { btn: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: RADIUS.lg },  txt: { fontSize: 15 } },
  lg: { btn: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: RADIUS.xl },  txt: { fontSize: 16 } },
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
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? COLORS.primary : (variant === 'neutral' ? COLORS.textSecondary : '#fff')} />
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
