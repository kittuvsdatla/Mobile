/**
 * DashboardNavigator — Premium Zepto/Zomato nav
 * - navRef pattern for reliable More sheet navigation
 * - Clean, simple emoji icons in colored circles
 * - No logout in More sheet (it's in Settings)
 * - All More items navigate correctly
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Modal, ScrollView,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { fetchDashboardStats } from '@/store/slices/reportsSlice';
import { fetchSales } from '@/store/slices/salesSlice';
import { fetchPurchases } from '@/store/slices/purchasesSlice';
import { fetchCustomers, fetchSuppliers } from '@/store/slices/partiesSlice';
import { fetchStock, fetchLowAlerts } from '@/store/slices/stockSlice';
import { fetchTransporters } from '@/store/slices/transportersSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Screens
import OverviewScreen     from '@/screens/Dashboard/OverviewScreen';
import PartiesScreen      from '@/screens/Dashboard/PartiesScreen';
import ProductsScreen     from '@/screens/Dashboard/ProductsScreen';
import StockScreen        from '@/screens/Dashboard/StockScreen';
import SalesScreen        from '@/screens/Dashboard/SalesScreen';
import PurchasesScreen    from '@/screens/Dashboard/PurchasesScreen';
import TransportersScreen from '@/screens/Dashboard/TransportersScreen';
import DuesScreen         from '@/screens/Dashboard/DuesScreen';
import ReportsScreen      from '@/screens/Dashboard/ReportsScreen';
import EmployeesScreen    from '@/screens/Dashboard/EmployeesScreen';
import NewsScreen         from '@/screens/Dashboard/NewsScreen';
import SettingsScreen     from '@/screens/Dashboard/SettingsScreen';
import LedgerScreen       from '@/screens/Dashboard/LedgerScreen';

const Tab = createBottomTabNavigator();

// ─── Color tokens ────────────────────────────────────────────────────────────
const PRIMARY   = '#10b981';
const INACTIVE  = '#94a3b8';
const ACTIVE_BG = '#ecfdf5';
const NAVY      = '#0f172a';

// ─────────────────────────────────────────────────────────────────────────────
// TAB ICONS — minimal & sharp
// ─────────────────────────────────────────────────────────────────────────────

// Home: classic house outline
function HomeIcon({ active }: { active: boolean }) {
  const c = active ? PRIMARY : INACTIVE;
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      {/* Roof */}
      <View style={{ width: 0, height: 0, borderLeftWidth: 12, borderRightWidth: 12, borderBottomWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />
      {/* Body */}
      <View style={{ width: 18, height: 12, borderWidth: 2, borderTopWidth: 0, borderColor: c, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 0 }}>
        <View style={{ width: 6, height: 8, borderWidth: 2, borderBottomWidth: 0, borderColor: c, borderRadius: 1 }} />
      </View>
    </View>
  );
}

// Sales: upward bar chart (trending revenue)
function SalesIcon({ active }: { active: boolean }) {
  const c = active ? PRIMARY : INACTIVE;
  const bars = [8, 12, 10, 17];
  return (
    <View style={{ width: 24, height: 24, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
      <View style={{ flexDirection: 'row', gap: 2.5, alignItems: 'flex-end' }}>
        {bars.map((h, i) => (
          <View key={i} style={{ width: 4, height: h, backgroundColor: c, borderRadius: 2, opacity: active ? 0.5 + i * 0.17 : 0.6 }} />
        ))}
      </View>
    </View>
  );
}

// Purchases: shopping bag
function PurchaseIcon({ active }: { active: boolean }) {
  const c = active ? PRIMARY : INACTIVE;
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 18, height: 13, borderWidth: 2, borderColor: c, borderRadius: 3, marginTop: 7, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 7, height: 2, backgroundColor: c, borderRadius: 1 }} />
      </View>
      <View style={{ position: 'absolute', top: 3, width: 10, height: 7, borderWidth: 2, borderColor: c, borderBottomWidth: 0, borderTopLeftRadius: 5, borderTopRightRadius: 5 }} />
    </View>
  );
}

// Dues: credit card with alert indicator
function DuesIcon({ active }: { active: boolean }) {
  const c = active ? PRIMARY : INACTIVE;
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 22, height: 14, borderWidth: 2, borderColor: c, borderRadius: 3 }}>
        <View style={{ height: 4, backgroundColor: c, marginTop: 2, marginHorizontal: -1 }} />
      </View>
      <View style={{ position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: active ? '#f43f5e' : INACTIVE, borderWidth: 2, borderColor: '#f8fafc' }} />
    </View>
  );
}

// More: three horizontal dots
function MoreIcon({ active }: { active: boolean }) {
  const c = active ? PRIMARY : INACTIVE;
  return (
    <View style={{ width: 24, height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      {[0, 1, 2].map(i => <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: c }} />)}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TAB BAR
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { name: 'Overview',  label: 'Home',     Icon: HomeIcon },
  { name: 'Sales',     label: 'Sales',    Icon: SalesIcon },
  { name: 'Purchases', label: 'Buy',      Icon: PurchaseIcon },
  { name: 'Dues',      label: 'Dues',     Icon: DuesIcon },
  { name: 'More',      label: 'More',     Icon: MoreIcon },
];

function CustomTabBar({ state, navigation, onMorePress }: any) {
  const insets = useSafeAreaInsets();
  const scales = useRef(TABS.map(() => new Animated.Value(1))).current;

  const handlePress = useCallback((index: number, name: string) => {
    if (name === 'More') { onMorePress(); return; }
    Animated.sequence([
      Animated.timing(scales[index], { toValue: 0.8, duration: 65, useNativeDriver: true }),
      Animated.spring(scales[index], { toValue: 1, tension: 240, friction: 7, useNativeDriver: true }),
    ]).start();
    navigation.navigate(name);
  }, [navigation, onMorePress]);

  return (
    <View style={[tabS.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((item, idx) => {
        const focused = state.routes[state.index]?.name === item.name;
        return (
          <TouchableOpacity key={item.name} style={tabS.btn} onPress={() => handlePress(idx, item.name)} activeOpacity={1}>
            <Animated.View style={[tabS.inner, { transform: [{ scale: scales[idx] }] }]}>
              <View style={[tabS.pill, focused && tabS.pillActive]}>
                <item.Icon active={focused} />
              </View>
              <Text style={[tabS.lbl, focused && tabS.lblActive]}>{item.label}</Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MORE SHEET — simple emoji icons, no logout
// ─────────────────────────────────────────────────────────────────────────────
const MORE_ITEMS = [
  { key: 'Parties',      label: 'Parties',    emoji: '👥', bg: '#eff6ff', color: '#2563eb' },
  { key: 'Products',     label: 'Products',   emoji: '📦', bg: '#ecfdf5', color: '#059669' },
  { key: 'Stock',        label: 'Stock',      emoji: '🏭', bg: '#faf5ff', color: '#7c3aed' },
  { key: 'Transporters', label: 'Transport',  emoji: '🚛', bg: '#fffbeb', color: '#d97706' },
  { key: 'Reports',      label: 'Reports',    emoji: '📊', bg: '#ecfeff', color: '#0891b2' },
  { key: 'Employees',    label: 'Employees',  emoji: '👨‍💼', bg: '#fdf2f8', color: '#be185d' },
  { key: 'News',         label: 'News',       emoji: '📰', bg: '#f7fee7', color: '#65a30d' },
  { key: 'Settings',     label: 'Settings',   emoji: '⚙️', bg: '#f8fafc', color: '#475569' },
];

function MoreSheet({ visible, onClose, onNavigate, user }: any) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const insets    = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 13, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 240, useNativeDriver: true }),
        Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: bgOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[moreS.sheet, { paddingBottom: Math.max(insets.bottom, 20), transform: [{ translateY: slideAnim }] }]}>
        <View style={moreS.handle} />

        {/* Profile strip */}
        <View style={moreS.profileRow}>
          <View style={moreS.avatar}>
            <Text style={moreS.avatarTxt}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={moreS.profileName}>{user?.name || 'User'}</Text>
            <Text style={moreS.profileSub} numberOfLines={1}>{user?.entityName || 'BusinessApp'}</Text>
          </View>
          <View style={moreS.badge}><Text style={moreS.badgeTxt}>{user?.role === 'client' ? 'Owner' : (user?.role || 'User')}</Text></View>
        </View>

        {/* Grid of items */}
        <View style={moreS.grid}>
          {MORE_ITEMS.map(item => (
            <TouchableOpacity
              key={item.key}
              style={moreS.gridItem}
              onPress={() => onNavigate(item.key)}
              activeOpacity={0.72}
            >
              <View style={[moreS.iconBox, { backgroundColor: item.bg }]}>
                <Text style={moreS.iconEmoji}>{item.emoji}</Text>
              </View>
              <Text style={[moreS.gridLabel, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}

function MorePlaceholder() {
  return <View style={{ flex: 1, backgroundColor: '#f8fafc' }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const [moreVisible, setMoreVisible] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(true);
  const { user } = useSelector((state: RootState) => state.auth);
  // Store the tab navigator's navigation object for direct use in MoreSheet
  const tabNavRef = useRef<any>(null);

  React.useEffect(() => {
    // Prefetch all critical data on dashboard mount
    Promise.all([
      dispatch(fetchDashboardStats()),
      dispatch(fetchSales()),
      dispatch(fetchPurchases()),
      dispatch(fetchCustomers()),
      dispatch(fetchSuppliers()),
      dispatch(fetchStock()),
      dispatch(fetchLowAlerts()),
      dispatch(fetchTransporters()),
    ]).finally(() => {
      // Small delay to ensure smooth transition
      setTimeout(() => setIsPrefetching(false), 500);
    });
  }, [dispatch]);

  const handleMoreNavigate = (key: string) => {
    setMoreVisible(false);
    // Small delay so sheet close animation plays first
    setTimeout(() => {
      tabNavRef.current?.navigate(key);
    }, 80);
  };

  if (isPrefetching) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinner message="Waking up your dashboard..." />
      </View>
    );
  }

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => {
          // Capture the navigator's navigation on every render
          tabNavRef.current = props.navigation;
          return (
            <CustomTabBar
              {...props}
              onMorePress={() => setMoreVisible(true)}
            />
          );
        }}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#ffffff', elevation: 0, shadowOpacity: 0 } as any,
          headerTitleStyle: { fontSize: 18, fontWeight: '800', color: NAVY },
          headerTintColor: PRIMARY,
          headerShadowVisible: false,
        }}
      >
        {/* Main tabs */}
        <Tab.Screen name="Overview"  component={OverviewScreen}  options={{ headerShown: false }} />
        <Tab.Screen name="Sales"     component={SalesScreen}     options={{ title: 'Sales', headerShown: false }} />
        <Tab.Screen name="Purchases" component={PurchasesScreen} options={{ title: 'Purchases', headerShown: false }} />
        <Tab.Screen name="Dues"      component={DuesScreen}      options={{ title: 'Dues', headerShown: false }} />
        <Tab.Screen name="More"      component={MorePlaceholder} options={{ title: 'More' }}
          listeners={{ tabPress: (e: any) => { e.preventDefault(); setMoreVisible(true); } }} />

        {/* Hidden screens (navigated from More sheet) — all headerShown:false so each screen owns its notch */}
        <Tab.Screen name="Parties"      component={PartiesScreen}      options={{ tabBarButton: () => null, headerShown: false }} />
        <Tab.Screen name="Products"     component={ProductsScreen}     options={{ tabBarButton: () => null, title: 'Products', headerShown: false }} />
        <Tab.Screen name="Stock"        component={StockScreen}        options={{ tabBarButton: () => null, title: 'Stock', headerShown: false }} />
        <Tab.Screen name="Transporters" component={TransportersScreen} options={{ tabBarButton: () => null, title: 'Transporters', headerShown: false }} />
        <Tab.Screen name="Reports"      component={ReportsScreen}      options={{ tabBarButton: () => null, title: 'Reports', headerShown: false }} />
        <Tab.Screen name="Employees"    component={EmployeesScreen}    options={{ tabBarButton: () => null, title: 'Employees', headerShown: false }} />
        <Tab.Screen name="News"         component={NewsScreen}         options={{ tabBarButton: () => null, title: 'News', headerShown: false }} />
        <Tab.Screen name="Settings"     component={SettingsScreen}     options={{ tabBarButton: () => null, title: 'Settings', headerShown: false }} />
        <Tab.Screen name="Ledger"       component={LedgerScreen}       options={{ tabBarButton: () => null, title: 'Ledger', headerShown: false }} />
      </Tab.Navigator>

      <MoreSheet
        visible={moreVisible}
        onClose={() => setMoreVisible(false)}
        onNavigate={handleMoreNavigate}
        user={user}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const tabS = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 16,
  },
  btn:      { flex: 1, alignItems: 'center' },
  inner:    { alignItems: 'center', gap: 3 },
  pill:     { width: 48, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: ACTIVE_BG },
  lbl:      { fontSize: 10, fontWeight: '500', color: INACTIVE },
  lblActive:{ color: PRIMARY, fontWeight: '700' },
});

const moreS = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 24,
  },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 999, alignSelf: 'center', marginBottom: 20 },

  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 14,
    marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9',
  },
  avatar:      { width: 46, height: 46, borderRadius: 23, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { fontSize: 20, fontWeight: '900', color: '#fff' },
  profileName: { fontSize: 15, fontWeight: '800', color: NAVY },
  profileSub:  { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  badge:       { backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTxt:    { fontSize: 11, fontWeight: '700', color: PRIMARY, textTransform: 'capitalize' },

  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  gridItem:  { width: '25%', alignItems: 'center', paddingVertical: 12 },
  iconBox:   { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  iconEmoji: { fontSize: 26 },
  gridLabel: { fontSize: 11.5, fontWeight: '700', textAlign: 'center' },
});
