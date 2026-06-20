import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';

const QUICK_LINKS = ['Home', 'Products', 'About Us', 'Contact'];
const SERVICES    = ['Inventory Management', 'Sales Tracking', 'Customer Management', 'Supplier Relations', 'Financial Reports'];

export default function Footer() {
  return (
    <View style={styles.footer}>
      {/* Company Info */}
      <View style={styles.companySection}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}><Text style={styles.logoLetter}>B</Text></View>
          <Text style={styles.companyName}>BusinessApp</Text>
        </View>
        <Text style={styles.companyDesc}>
          Complete business management solution for modern enterprises.
          Streamline your operations with our comprehensive suite of tools.
        </Text>
        {/* Social Buttons */}
        <View style={styles.socialRow}>
          {['📘', '🐦', '📷'].map((icon, i) => (
            <TouchableOpacity key={i} style={styles.socialBtn} activeOpacity={0.7}>
              <Text style={styles.socialIcon}>{icon}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Links + Services Row */}
      <View style={styles.linksRow}>
        <View style={styles.linksCol}>
          <Text style={styles.colTitle}>Quick Links</Text>
          {QUICK_LINKS.map(link => (
            <Text key={link} style={styles.link}>{link}</Text>
          ))}
        </View>
        <View style={styles.linksCol}>
          <Text style={styles.colTitle}>Services</Text>
          {SERVICES.map(s => (
            <Text key={s} style={styles.link}>{s}</Text>
          ))}
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.contactSection}>
        <Text style={styles.colTitle}>Contact Info</Text>
        <Text style={styles.contactItem}>📍  Pydiparru, Tanuku</Text>
        <TouchableOpacity onPress={() => Linking.openURL('tel:+919876543210')}>
          <Text style={styles.contactItem}>📞  +91 9876543210</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:info@businessapp.com')}>
          <Text style={styles.contactItem}>✉️  info@businessapp.com</Text>
        </TouchableOpacity>
      </View>

      {/* Made with love */}
      <View style={styles.loveRow}>
        <Text style={styles.loveText}>Made with love ❤️</Text>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.copyright}>© 2025 BusinessApp. All rights reserved.</Text>
        <View style={styles.legalRow}>
          {['Privacy Policy', 'Terms', 'Cookies'].map(item => (
            <Text key={item} style={styles.legalLink}>{item}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer:          { backgroundColor: '#111827', padding: 24, paddingBottom: 40 },
  companySection:  { marginBottom: 24 },
  logoRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  logoIcon:        { width: 36, height: 36, borderRadius: 9, backgroundColor: '#f16a0a', alignItems: 'center', justifyContent: 'center' },
  logoLetter:      { color: '#fff', fontWeight: '800', fontSize: 18 },
  companyName:     { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  companyDesc:     { color: '#9ca3af', fontSize: 13, lineHeight: 22, marginBottom: 16 },
  socialRow:       { flexDirection: 'row', gap: 10 },
  socialBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' },
  socialIcon:      { fontSize: 16 },

  linksRow:        { flexDirection: 'row', gap: 24, marginBottom: 24 },
  linksCol:        { flex: 1 },
  colTitle:        { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  link:            { color: '#9ca3af', fontSize: 13, marginBottom: 8, lineHeight: 20 },

  contactSection:  { marginBottom: 20 },
  contactItem:     { color: '#9ca3af', fontSize: 13, marginBottom: 10, lineHeight: 20 },

  loveRow:         { alignItems: 'center', marginBottom: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f2937' },
  loveText:        { color: '#d1d5db', fontSize: 14, fontWeight: '500' },

  bottomBar:       { borderTopWidth: 1, borderTopColor: '#1f2937', paddingTop: 16 },
  copyright:       { color: '#6b7280', fontSize: 12, marginBottom: 10 },
  legalRow:        { flexDirection: 'row', gap: 16 },
  legalLink:       { color: '#6b7280', fontSize: 12 },
});
