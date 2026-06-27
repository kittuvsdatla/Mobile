/**
 * BusinessApp Mobile — Root Entry Point
 * React Native 0.86 + NativeWind v4 + Redux + React Navigation
 */

import 'text-encoding';
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider as ReduxProvider } from 'react-redux';
import Toast from 'react-native-toast-message';

import { store }      from '@/store';
import AppNavigator   from '@/navigation/AppNavigator';

// NativeWind global CSS — processed by metro withNativeWind()
import '@/styles/global.css';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
            <AppNavigator />
            <Toast />
          </NavigationContainer>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
