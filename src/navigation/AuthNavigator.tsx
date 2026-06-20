import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/types';
import LoginScreen   from '@/screens/Auth/LoginScreen';
import SignupScreen  from '@/screens/Auth/SignupScreen';
import PendingScreen from '@/screens/Auth/PendingScreen';
import ExpiredScreen from '@/screens/Auth/ExpiredScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login"   component={LoginScreen} />
      <Stack.Screen name="Signup"  component={SignupScreen} />
      <Stack.Screen name="Pending" component={PendingScreen} />
      <Stack.Screen name="Expired" component={ExpiredScreen} />
    </Stack.Navigator>
  );
}
