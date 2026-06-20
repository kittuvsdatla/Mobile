import React, { useEffect } from 'react';
import {
  Modal as RNModal, View, Text, TouchableOpacity,
  StyleSheet, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: number | 'auto';
}

export const Modal: React.FC<ModalProps> = ({
  visible, onClose, title, children, height = 'auto',
}) => {
  const slideAnim = new Animated.Value(SCREEN_HEIGHT);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <RNModal visible={visible} transparent={true} statusBarTranslucent={true} navigationBarTranslucent={true} animationType="none" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kvContainer}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <Animated.View
              style={[
                styles.sheet,
                { transform: [{ translateY: slideAnim }] },
                height !== 'auto' ? { height } : { maxHeight: SCREEN_HEIGHT * 0.92 },
                { paddingBottom: insets.bottom },
              ]}
            >
              {/* Handle bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              {title ? (
                <View style={styles.header}>
                  <Text style={styles.title}>{title}</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                    <Text style={styles.closeText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Content */}
              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  kvContainer: { justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handleBar:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#d1d5db', alignSelf: 'center', marginTop: 12 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title:       { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  closeBtn:    { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderRadius: 16 },
  closeText:   { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  content:     { padding: 20 },
});
