/**
 * SplashScreen — Vibrant Zepto/Blinkit inspired splash
 * Features a bright primary background, a bouncy logo, and a guaranteed transition.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, StatusBar, Easing
} from 'react-native';
import { COLORS, RADIUS } from '@/styles/theme';

const { width } = Dimensions.get('window');

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const logoScale    = useRef(new Animated.Value(0)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textTranslate= useRef(new Animated.Value(20)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  // We use a safe fallback timer to absolutely guarantee onFinish is called
  // even if the Android animation engine stalls.
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      onFinish();
    }, 2800); // Max splash duration is 2.8s

    return () => clearTimeout(fallbackTimer);
  }, [onFinish]);

  useEffect(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(COLORS.primary);

    // Sequence for entrance
    Animated.sequence([
      // 1. Logo springs in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // 2. Text slides up and fades in
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslate, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // 3. Hold for a moment so user can see it
      Animated.delay(600),
      // 4. Smooth fade out of the entire screen
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        StatusBar.setBarStyle('dark-content');
        StatusBar.setBackgroundColor('transparent');
        onFinish();
      }
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />

      <View style={styles.content}>
        {/* Logo Container */}
        <Animated.View style={[
          styles.logoCircle,
          { 
            opacity: logoOpacity, 
            transform: [{ scale: logoScale }] 
          },
        ]}>
          <Text style={styles.logoLetter}>B</Text>
        </Animated.View>

        {/* Text Area */}
        <Animated.View style={[
          styles.textArea, 
          { 
            opacity: textOpacity,
            transform: [{ translateY: textTranslate }]
          }
        ]}>
          <Text style={styles.appName}>BusinessApp</Text>
          <Text style={styles.tagline}>Deliveries in minutes.</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Zepto/Blinkit vibrant primary color
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.xl,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoLetter: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  textArea: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
