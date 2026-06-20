import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';
import type { DashboardDrawerParamList } from '@/types';

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

const Drawer = createDrawerNavigator<DashboardDrawerParamList>();

const NAV_ITEMS = [
  { name: 'Overview'     as const, label: 'Dashboard',    icon: '🏠' },
  { name: 'Parties'      as const, label: 'Parties',      icon: '👥' },
  { name: 'Products'     as const, label: 'Products',     icon: '📦' },
  { name: 'Stock'        as const, label: 'Stock',        icon: '🏭' },
  { name: 'Sales'        as const, label: 'Sales',        icon: '💰' },
  { name: 'Purchases'    as const, label: 'Purchases',    icon: '🛒' },
  { name: 'Transporters' as const, label: 'Transporters', icon: '🚛' },
  { name: 'Dues'         as const, label: 'Dues',         icon: '💳' },
  { name: 'Reports'      as const, label: 'Reports',      icon: '📊' },
  { name: 'Employees'    as const, label: 'Employees',    icon: '👷' },
  { name: 'News'         as const, label: 'News',         icon: '📰' },
  { name: 'Settings'     as const, label: 'Settings',     icon: '⚙️' },
];

// ---- Custom Drawer Content ----
function CustomDrawerContent(props: DrawerContentComponentProps) {
  const dispatch    = useDispatch<AppDispatch>();
  const { user }   = useSelector((state: RootState) => state.auth);
  const insets     = useSafeAreaInsets();
  const activeRoute = props.state.routes[props.state.index]?.name;

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.name === 'Employees' && user?.role !== 'client')      { return false; }
    if (item.name === 'News'      && user?.entityType !== 'Paddyshop') { return false; }
    if (user?.role === 'employee' && user.permissions) {
      const p = user.permissions;
      if (item.name === 'Sales'      && !p.canViewSales)      { return false; }
      if (item.name === 'Purchases'  && !p.canViewPurchases)  { return false; }
      if (item.name === 'Stock'      && !p.canViewStock)      { return false; }
      if (item.name === 'Parties'    && !p.canManageParties)  { return false; }
      if (item.name === 'Dues'       && !p.canReceiveDue)     { return false; }
      if (item.name === 'Reports'    && !p.canViewReports)    { return false; }
    }
    return true;
  });

  const handleLogout = async () => { await dispatch(logoutUser()); };

  return (
    <View style={styles.fullscreenContainer}>
      {/* Sidebar Content (Left side, fixed width) */}
      <View style={styles.drawerContainer}>
        {/* Header — respects status bar height via safeAreaInsets */}
        <View style={[styles.drawerHeader, { paddingTop: insets.top + 16 }]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={styles.appName}>BusinessApp</Text>
          {user?.entityName ? (
            <View style={styles.entityBadge}>
              <Text style={styles.entityLabel}>BUSINESS</Text>
              <Text style={styles.entityName} numberOfLines={1}>{user.entityName}</Text>
            </View>
          ) : null}
        </View>

        {/* Nav Items — scrollable */}
        <DrawerContentScrollView
          {...props}
          contentContainerStyle={styles.navScroll}
          showsVerticalScrollIndicator={false}
        >
          {visibleItems.map(item => {
            const isActive = activeRoute === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => props.navigation.navigate(item.name)}
                style={[styles.navItem, isActive && styles.navItemActive]}
                activeOpacity={0.7}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </DrawerContentScrollView>

        {/* Logout — respects bottom safe area (home indicator / nav bar) */}
        <View style={[styles.drawerFooter, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
          <Text style={styles.userRole}>
            {user?.role === 'client' ? 'Business Owner' : user?.role}
          </Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tap-to-Close Overlay (Fills the remaining screen area on the right) */}
      <TouchableOpacity
        style={styles.clickableOverlay}
        activeOpacity={1}
        onPress={() => props.navigation.closeDrawer()}
      />
    </View>
  );
}

// ---- Drawer Navigator ----
export default function DashboardNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Overview"
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontSize: 17, fontWeight: '700', color: '#1f2937' },
        headerTintColor: '#f16a0a',

        // Smooth slide drawer — no flash/jank
        drawerType: 'front',
        drawerStyle: { width: '100%', backgroundColor: 'transparent' },

        // Overlay dims the background; tapping it closes the drawer
        overlayColor: 'transparent',

        // Native gesture-driven open/close
        swipeEnabled: true,
        swipeEdgeWidth: 40,

        // Smooth animation config
        drawerHideStatusBarOnOpen: false,
        drawerStatusBarAnimation: 'fade',
      }}
    >
      <Drawer.Screen name="Overview"     component={OverviewScreen}     options={{ title: 'Dashboard' }} />
      <Drawer.Screen name="Parties"      component={PartiesScreen}      options={{ title: 'Parties' }} />
      <Drawer.Screen name="Products"     component={ProductsScreen}     options={{ title: 'Products' }} />
      <Drawer.Screen name="Stock"        component={StockScreen}        options={{ title: 'Stock' }} />
      <Drawer.Screen name="Sales"        component={SalesScreen}        options={{ title: 'Sales' }} />
      <Drawer.Screen name="Purchases"    component={PurchasesScreen}    options={{ title: 'Purchases' }} />
      <Drawer.Screen name="Transporters" component={TransportersScreen} options={{ title: 'Transporters' }} />
      <Drawer.Screen name="Dues"         component={DuesScreen}         options={{ title: 'Dues' }} />
      <Drawer.Screen name="Reports"      component={ReportsScreen}      options={{ title: 'Reports' }} />
      <Drawer.Screen name="Employees"    component={EmployeesScreen}    options={{ title: 'Employees' }} />
      <Drawer.Screen name="News"         component={NewsScreen}         options={{ title: 'News' }} />
      <Drawer.Screen name="Settings"     component={SettingsScreen}     options={{ title: 'Settings' }} />
      <Drawer.Screen name="Ledger"       component={LedgerScreen}       options={{ title: 'Ledger Statement' }} />
    </Drawer.Navigator>
  );
}

const ORANGE = '#f16a0a';

const styles = StyleSheet.create({
  fullscreenContainer: { flex: 1, flexDirection: 'row', backgroundColor: 'transparent' },
  drawerContainer: { width: 288, backgroundColor: '#ffffff', height: '100%' },
  clickableOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', height: '100%' },

  drawerHeader: {
    backgroundColor: '#1f2937',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  logoCircle: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  logoText:   { color: '#fff', fontSize: 22, fontWeight: '800' },
  appName:    { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  entityBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8, padding: 8,
  },
  entityLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10, fontWeight: '600', letterSpacing: 1,
  },
  entityName: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginTop: 2 },

  navScroll: { paddingVertical: 12 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 16,
    marginHorizontal: 8, marginVertical: 1,
    borderRadius: 10, position: 'relative',
  },
  navItemActive:    { backgroundColor: '#fef7ee' },
  navIcon:          { fontSize: 20, width: 32 },
  navLabel:         { fontSize: 14, fontWeight: '500', color: '#6b7280', flex: 1 },
  navLabelActive:   { color: ORANGE, fontWeight: '700' },
  activeIndicator:  {
    position: 'absolute', right: 12,
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: ORANGE,
  },

  drawerFooter: {
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    paddingTop: 14, paddingHorizontal: 16,
  },
  userName:  { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  userRole:  {
    fontSize: 12, color: '#9ca3af',
    marginTop: 2, marginBottom: 12, textTransform: 'capitalize',
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  logoutIcon: { fontSize: 16, marginRight: 10 },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
});
