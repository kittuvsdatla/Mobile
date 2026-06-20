import React from 'react';
import {
  ScrollView, View, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header         from '@/components/layout/Header';
import HeroSection    from '@/components/sections/HeroSection';
import ProductSlider  from '@/components/sections/ProductSlider';
import FeaturesSection from '@/components/sections/FeaturesSection';
import Footer         from '@/components/layout/Footer';

export default function LandingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.gradient}>
          <HeroSection />
        </View>
        <ProductSlider />
        <FeaturesSection />
        <Footer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#fffbf5' },
  scroll:        { flex: 1 },
  scrollContent: { flexGrow: 1 },
  gradient:      { backgroundColor: '#fffbf5' },
});
