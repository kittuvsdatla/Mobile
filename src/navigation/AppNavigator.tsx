import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector }    from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { checkAuth }                   from '@/store/slices/authSlice';
import type { RootStackParamList }     from '@/types';

import SplashScreen       from '@/screens/SplashScreen';
import LandingScreen      from '@/screens/Landing/LandingScreen';
import AuthNavigator      from './AuthNavigator';
import DashboardNavigator from './DashboardNavigator';
import AdminScreen        from '@/screens/Admin/AdminScreen';
import PinUnlockScreen    from '@/screens/Auth/PinUnlockScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isPinUnlocked, isLoading, user } = useSelector((state: RootState) => state.auth);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  // Show splash until animation completes (has a built-in fallback timer)
  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Auth"    component={AuthNavigator} />
        </>
      ) : !isPinUnlocked ? (
        <Stack.Screen name="PinUnlock" component={PinUnlockScreen} />
      ) : user?.role === 'superadmin' ? (
        <Stack.Screen name="Admin" component={AdminScreen} />
      ) : (
        <Stack.Screen name="Dashboard" component={DashboardNavigator} />
      )}
    </Stack.Navigator>
  );
}
