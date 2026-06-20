import React, { useState } from 'react';
import {
  View, TextInput, Text, TouchableOpacity, StyleSheet, TextInputProps, ViewStyle,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label, error, hint, leftIcon, rightIcon, onRightIconPress,
  containerStyle, required, secureTextEntry, ...rest
}) => {
  const [focused,   setFocused]   = useState(false);
  const [showSecure, setShowSecure] = useState(false);

  const borderColor = error ? '#ef4444' : focused ? '#f16a0a' : '#d1d5db';

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}{required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View style={[styles.inputRow, { borderColor }]}>
        {leftIcon ? <Text style={styles.leftIcon}>{leftIcon}</Text> : null}

        <TextInput
          {...rest}
          secureTextEntry={secureTextEntry && !showSecure}
          style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor="#9ca3af"
        />

        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setShowSecure(!showSecure)}
            style={styles.rightIconBtn}
          >
            <Text style={styles.rightIcon}>{showSecure ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn}>
            <Text style={styles.rightIcon}>{rightIcon}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>⚠ {error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container:     { marginBottom: 16 },
  label:         { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  required:      { color: '#ef4444' },
  inputRow:      {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 10,
    backgroundColor: '#ffffff', overflow: 'hidden',
  },
  input:         { flex: 1, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: '#1f2937' },
  inputWithLeft: { paddingLeft: 8 },
  leftIcon:      { fontSize: 18, paddingLeft: 14 },
  rightIconBtn:  { paddingHorizontal: 14 },
  rightIcon:     { fontSize: 18 },
  error:         { fontSize: 12, color: '#ef4444', marginTop: 4 },
  hint:          { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
