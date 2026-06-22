import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, StatusBar, Dimensions, Animated, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootState, AppDispatch } from '@/store';
import { fetchDashboardStats } from '@/store/slices/reportsSlice';
import { fetchSales } from '@/store/slices/salesSlice';
import { logoutUser } from '@/store/slices/authSlice';

const { width } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  navy:     '#0f172a',
  navyMid:  '#1e293b',
  bg:       '#f1f5f9',
  surface:  '#ffffff',
  primary:  '#6366f1',
  primaryDk:'#4f46e5',
  primaryBg:'#eef2ff',
  rose:     '#f43f5e',
  roseBg:   '#fff1f2',
  amber:    '#f59e0b',
  emerald:  '#10b981',
  emeraldBg:'#ecfdf5',
  t1:       '#0f172a',
  t2:       '#334155',
  t3:       '#64748b',
  t4:       '#94a3b8',
  bdr:      '#e2e8f0',
  bdrL:     '#f1f5f9',
};

// ── Full INR format ───────────────────────────────────────────────────────────
function fmtINR(n: number) {
  return '₹' + (n || 0).toLocaleString('en-IN');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
}

// ── Profile Sheet ─────────────────────────────────────────────────────────────
function ProfileSheet({ visible, onClose, user, onLogout }: any) {
  const slide  = useRef(new Animated.Value(500)).current;
  const bg     = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, tension: 72, friction: 12, useNativeDriver: true }),
        Animated.timing(bg, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slide, { toValue: 500, duration: 230, useNativeDriver: true }),
        Animated.timing(bg, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: bg }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[ps.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY: slide }] }]}>
        <View style={ps.handle} />
        <View style={ps.center}>
          <View style={ps.bigAvatar}>
            <Text style={ps.bigAvatarTxt}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={ps.name}>{user?.name || 'User'}</Text>
          <Text style={ps.entity}>{user?.entityName || 'BusinessApp'}</Text>
          <View style={ps.rolePill}><Text style={ps.roleTxt}>{user?.role === 'client' ? 'Business Owner' : user?.role || 'User'}</Text></View>
        </View>
        {user?.phone ? <View style={ps.row}><Text>📱</Text><Text style={ps.rowTxt}>+91 {user.phone}</Text></View> : null}
        {user?.email ? <View style={ps.row}><Text>✉️</Text><Text style={ps.rowTxt}>{user.email}</Text></View> : null}
        <View style={ps.divider} />
        <TouchableOpacity style={ps.logoutBtn} onPress={() => { onClose(); onLogout(); }}>
          <Text style={ps.logoutTxt}>🚪  Sign Out</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
const QUICK = [
  { label: 'New Sale',  screen: 'Sales',     emoji: '📄', bg: '#ecfdf5', col: '#10b981' },
  { label: 'Purchase',  screen: 'Purchases', emoji: '🛒', bg: '#eff6ff', col: '#3b82f6' },
  { label: 'Dues',      screen: 'Dues',      emoji: '💳', bg: '#fff1f2', col: '#f43f5e' },
  { label: 'Reports',   screen: 'Reports',   emoji: '📊', bg: '#faf5ff', col: '#8b5cf6' },
  { label: 'Parties',   screen: 'Parties',   emoji: '👥', bg: '#ecfeff', col: '#06b6d4' },
  { label: 'Stock',     screen: 'Stock',     emoji: '📦', bg: '#fffbeb', col: '#f59e0b' },
];

// ── Business Overview metrics ─────────────────────────────────────────────────
const METRICS = [
  { key: 'customerCount',    label: 'Customers',    emoji: '👥', screen: 'Parties' },
  { key: 'supplierCount',    label: 'Suppliers',    emoji: '🚛', screen: 'Parties' },
  { key: 'productCount',     label: 'Products',     emoji: '📦', screen: 'Products' },
  { key: 'salesCount',       label: 'Sales',        emoji: '💰', screen: 'Sales' },
  { key: 'purchasesCount',   label: 'Purchases',    emoji: '🛍', screen: 'Purchases' },
  { key: 'totalDuesBalance', label: 'Pending Dues', emoji: '⚡', isAmt: true, screen: 'Dues' },
];

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function OverviewScreen() {
  const dispatch   = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const { user }           = useSelector((s: RootState) => s.auth);
  const { dashboardStats } = useSelector((s: RootState) => s.reports);
  const { items: sales }   = useSelector((s: RootState) => s.sales);
  const [refreshing, setRefreshing] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  const load = () => {
    dispatch(fetchDashboardStats());
    dispatch(fetchLowAlerts());
    dispatch(fetchDues(undefined));
  };
  const onRefresh = async () => { setRefreshing(true); load(); setRefreshing(false); };

  const todayTotal = sales
    .filter(s => new Date(s.date).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.finalTotal || 0), 0);
  const duesBalance = Number(dashboardStats?.totalDuesBalance ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} translucent />

      {/* ── Navy Header (Matches Products/Parties) ────────────────────── */}
      <View style={[S.headerGrad, { paddingTop: insets.top + 16, backgroundColor: T.navy }]}>
        <View style={S.headerContent}>
          <View style={{ flex: 1 }}>
            <Text style={S.greetLbl}>{getGreeting()}</Text>
            <Text style={S.heroName} numberOfLines={1}>{user?.name || 'User'}</Text>
            <Text style={S.heroEntity} numberOfLines={1}>{user?.entityName}</Text>
          </View>
          <TouchableOpacity style={S.avatarBtn} onPress={() => setProfileVisible(true)} activeOpacity={0.85}>
            <Text style={S.avatarTxt}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
            <View style={S.avatarOnline} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Floating Stats Card ───────────────────────────────────────── */}
      <View style={S.statsRow}>
        <View style={S.statCard}>
          <Text style={S.statLbl}>Today's Revenue</Text>
          <Text style={[S.statVal, { color: T.emerald }]} numberOfLines={1} adjustsFontSizeToFit>{fmtINR(todayTotal)}</Text>
        </View>
        <View style={[S.statCard, { borderLeftWidth: 1, borderLeftColor: T.bdrL, borderRightWidth: 1, borderRightColor: T.bdrL }]}>
          <Text style={S.statLbl}>Pending Dues</Text>
          <Text style={[S.statVal, duesBalance > 0 ? { color: T.rose } : { color: T.t1 }]} numberOfLines={1} adjustsFontSizeToFit>{fmtINR(duesBalance)}</Text>
        </View>
        <View style={S.statCard}>
          <Text style={S.statLbl}>Total Sales</Text>
          <Text style={S.statVal} numberOfLines={1} adjustsFontSizeToFit>{dashboardStats?.salesCount ?? '0'}</Text>
        </View>
      </View>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      >

        {/* Quick Actions */}
        <Text style={S.secTitle}>Quick Views</Text>
        <View style={S.actGrid}>
          {QUICK.map(a => (
            <TouchableOpacity key={a.label} style={[S.actCard, { backgroundColor: a.bg }]} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.78}>
              <View style={[S.emojiWrap, { backgroundColor: '#fff', shadowColor: a.col }]}>
                <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
              </View>
              <Text style={[S.actLbl, { color: a.col }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Business Overview */}
        <Text style={[S.secTitle, { marginTop: 12 }]}>Business Overview</Text>
        <View style={S.metGrid}>
          {METRICS.map(m => {
            const raw = dashboardStats?.[m.key] ?? 0;
            const displayVal = m.isAmt ? fmtINR(Number(raw)) : String(raw);
            return (
              <TouchableOpacity key={m.key} style={S.metCard} onPress={() => navigation.navigate(m.screen)} activeOpacity={0.78}>
                <View style={S.metTop}>
                  <View style={[S.metEmojiBox, { backgroundColor: T.primaryBg }]}>
                    <Text style={S.metEmoji}>{m.emoji}</Text>
                  </View>
                  <Text style={S.metCount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{displayVal}</Text>
                </View>
                <Text style={S.metLabel} numberOfLines={1}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 12 }} />
      </ScrollView>

      <ProfileSheet visible={profileVisible} onClose={() => setProfileVisible(false)} user={user} onLogout={() => dispatch(logoutUser())} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  // Hero (Navy Header)
  headerGrad:   { paddingHorizontal: 20, paddingBottom: 58, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent:{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  greetLbl:    { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroName:    { fontSize: 28, fontWeight: '900', color: T.surface, letterSpacing: -0.6, marginTop: 2 },
  heroEntity:  { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  avatarBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:    { fontSize: 24, fontWeight: '900', color: T.surface },
  avatarOnline: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: T.emerald,
    borderWidth: 2.5, borderColor: T.navy,
  },

  // Floating Stats Row
  statsRow:     { flexDirection: 'row', backgroundColor: T.surface, marginHorizontal: 20, borderRadius: 16, paddingVertical: 18, marginTop: -30, elevation: 6, shadowColor: T.navy, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16 },
  statCard:     { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statLbl:      { fontSize: 10, fontWeight: '700', color: T.t3, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6, textAlign: 'center' },
  statVal:      { fontSize: 20, fontWeight: '900', color: T.t1, textAlign: 'center' },

  // Section
  secTitle: { fontSize: 17, fontWeight: '900', color: T.t1, marginBottom: 14, letterSpacing: -0.3, marginLeft: 4 },

  // Quick Actions — 3 per row
  actGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24, justifyContent: 'space-between' },
  actCard: {
    width: '31.5%', // 3 columns
    borderRadius: 20, paddingVertical: 18, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  emojiWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  actLbl: { fontSize: 12, fontWeight: '800', textAlign: 'center', letterSpacing: 0.2 },

  // Business Overview — 2-col, beautiful card
  metGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  metCard: {
    width: '48%', // 2 columns
    backgroundColor: T.surface, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: T.bdrL,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  metTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10 },
  metCount: { fontSize: 22, fontWeight: '900', color: T.t1, letterSpacing: -0.5, flex: 1, textAlign: 'right' },
  metEmojiBox: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metEmoji: { fontSize: 20 },
  metLabel: { fontSize: 13, fontWeight: '700', color: T.t3 },
});

// ── Profile Sheet ─────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: T.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 20,
  },
  handle:      { width: 44, height: 5, backgroundColor: T.bdr, borderRadius: 999, alignSelf: 'center', marginBottom: 24 },
  center:      { alignItems: 'center', marginBottom: 24 },
  bigAvatar:   { width: 84, height: 84, borderRadius: 42, backgroundColor: T.emerald, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: T.emerald, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  bigAvatarTxt:{ fontSize: 36, fontWeight: '900', color: T.surface },
  name:        { fontSize: 22, fontWeight: '900', color: T.t1, marginBottom: 4 },
  entity:      { fontSize: 14, color: T.t3, marginBottom: 12, fontWeight: '500' },
  rolePill:    { backgroundColor: T.emeraldBg, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6 },
  roleTxt:     { fontSize: 13, fontWeight: '800', color: T.emerald },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.bdrL },
  rowTxt:      { fontSize: 15, fontWeight: '600', color: T.t2 },
  divider:     { height: 1, backgroundColor: T.bdrL, marginVertical: 18 },
  logoutBtn:   { alignItems: 'center', justifyContent: 'center', backgroundColor: T.roseBg, borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#fecdd3' },
  logoutTxt:   { fontSize: 16, fontWeight: '800', color: T.rose },
});
