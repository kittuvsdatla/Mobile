import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootState, AppDispatch } from '@/store';
import { showLoginModal } from '@/store/slices/uiSlice';
import { logoutUser }     from '@/store/slices/authSlice';
import type { RootStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const NAV_ITEMS = ['Home', 'Products', 'About', 'Contact'];

export default function Header() {
  const navigation  = useNavigation<Nav>();
  const dispatch    = useDispatch<AppDispatch>();
  const insets      = useSafeAreaInsets();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogin = () => {
    navigation.navigate('Auth');
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          {/* Logo */}
          <View style={styles.logo}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoLetter}>B</Text>
            </View>
            <Text style={styles.logoText}>BusinessApp</Text>
          </View>

          {/* Right Actions */}
          <View style={styles.actions}>
            {isAuthenticated ? (
              <>
                <View style={styles.userChip}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user?.name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                  <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                  <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.85}>
                <Text style={styles.loginText}>Login</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea:       { backgroundColor: 'transparent' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent' },
  logo:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoIcon:       { width: 36, height: 36, borderRadius: 9, backgroundColor: '#f16a0a', alignItems: 'center', justifyContent: 'center' },
  logoLetter:     { color: '#fff', fontWeight: '800', fontSize: 18 },
  logoText:       { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  actions:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userChip:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef7ee', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  userAvatar:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f16a0a', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  userName:       { fontSize: 12, fontWeight: '600', color: '#f16a0a', maxWidth: 80 },
  logoutBtn:      { paddingHorizontal: 12, paddingVertical: 6 },
  logoutText:     { fontSize: 13, fontWeight: '600', color: '#ef4444' },
  loginBtn:       { backgroundColor: '#f16a0a', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  loginText:      { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
