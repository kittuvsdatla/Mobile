import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector }    from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import { checkAuth }                   from '@/store/slices/authSlice';
import type { RootStackParamList }     from '@/types';

import LandingScreen      from '@/screens/Landing/LandingScreen';
import AuthNavigator      from './AuthNavigator';
import DashboardNavigator from './DashboardNavigator';
import AdminScreen        from '@/screens/Admin/AdminScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#f16a0a" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Auth"    component={AuthNavigator} />
        </>
      ) : user?.role === 'superadmin' ? (
        <Stack.Screen name="Admin" component={AdminScreen} />
      ) : (
        <Stack.Screen name="Dashboard" component={DashboardNavigator} />
      )}
    </Stack.Navigator>
  );
}
