// ============================================================
// BusinessApp Mobile — Centralized Configuration
// Reads from react-native-config (.env) with safe fallbacks
// ============================================================

import Config from 'react-native-config';

// ============================================================
// API Configuration
// ============================================================
export const apiConfig = {
  // Local dev: 'http://192.168.0.110:8080'
  baseUrl: Config.BACKEND_URL || 'https://backendbusinessapp.onrender.com',
  timeout: Number(Config.API_TIMEOUT) || 15000,
};

// ============================================================
// Firebase Configuration (identifiers only — no SDK keys here)
// ============================================================
export const firebaseConfig = {
  projectId: Config.FIREBASE_PROJECT_ID || 'businessapp-682eb',
  authDomain: Config.FIREBASE_AUTH_DOMAIN || 'businessapp-682eb.firebaseapp.com',
  messagingSenderId: Config.FIREBASE_MESSAGING_SENDER_ID || '88867405623',
};

// ============================================================
// App-wide Constants
// ============================================================
export const APP_NAME = 'BusinessApp';
export const APP_VERSION = '1.0.0';

// AsyncStorage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  PIN_UNLOCKED: 'pin_unlocked',
  THEME: 'app_theme',
} as const;
