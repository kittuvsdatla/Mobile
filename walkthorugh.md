# BusinessApp Mobile — Developer Guide & Walkthrough

## ✅ What Was Built

A complete React Native mobile clone of the BusinessApp Next.js web application, with:
- **NativeWind v4** (Tailwind CSS styling)  
- **Redux Toolkit** (11 slices, mirrors web state)
- **React Navigation v6** with Drawer (sidebar matching web)
- **Mobile-adapted API service** (AsyncStorage instead of localStorage)
- All **12 Dashboard screens**, **4 Auth screens**, **Landing page**, **Admin panel**

---

## 📁 Project Structure

```
UI_Mobile/
├── App.tsx                         ← Root entry point
├── .env                            ← Environment variables
├── .env.example                    ← Template for new devs
├── babel.config.js                 ← NativeWind + Reanimated plugins
├── tailwind.config.js              ← Color palette (orange/green/yellow)
├── metro.config.js                 ← NativeWind metro wrapper
├── tsconfig.json                   ← TypeScript with @/ path alias
│
└── src/
    ├── config/index.ts             ← Centralized config (env vars)
    ├── types/index.ts              ← All TypeScript interfaces
    ├── styles/global.css           ← NativeWind CSS entry
    ├── services/apiService.ts      ← REST client (AsyncStorage token)
    │
    ├── store/
    │   ├── index.ts                ← Redux store (11 reducers)
    │   └── slices/
    │       ├── authSlice.ts
    │       ├── uiSlice.ts
    │       ├── partiesSlice.ts
    │       ├── productsSlice.ts
    │       ├── stockSlice.ts
    │       ├── salesSlice.ts
    │       ├── purchasesSlice.ts
    │       ├── duesSlice.ts
    │       ├── transportersSlice.ts
    │       ├── employeesSlice.ts
    │       └── reportsSlice.ts
    │
    ├── navigation/
    │   ├── AppNavigator.tsx        ← Root (auth check → route)
    │   ├── AuthNavigator.tsx       ← Stack: Login/Signup/Pending/Expired
    │   └── DashboardNavigator.tsx  ← Drawer: 12 tabs + custom sidebar
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   └── Footer.tsx
    │   ├── sections/
    │   │   ├── HeroSection.tsx
    │   │   ├── ProductSlider.tsx
    │   │   └── FeaturesSection.tsx
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Modal.tsx
    │   │   ├── LoadingSpinner.tsx
    │   │   └── EmptyState.tsx
    │   └── providers/
    │       └── ReduxProvider.tsx
    │
    └── screens/
        ├── Landing/LandingScreen.tsx
        ├── Auth/
        │   ├── LoginScreen.tsx
        │   ├── SignupScreen.tsx
        │   ├── PendingScreen.tsx
        │   └── ExpiredScreen.tsx
        ├── Dashboard/
        │   ├── OverviewScreen.tsx
        │   ├── PartiesScreen.tsx
        │   ├── ProductsScreen.tsx
        │   ├── StockScreen.tsx
        │   ├── SalesScreen.tsx
        │   ├── PurchasesScreen.tsx
        │   ├── TransportersScreen.tsx
        │   ├── DuesScreen.tsx
        │   ├── ReportsScreen.tsx
        │   ├── EmployeesScreen.tsx
        │   ├── NewsScreen.tsx
        │   └── SettingsScreen.tsx
        └── Admin/AdminScreen.tsx
```

---

## 🔧 Environment Variables

### `.env` (Development)
```env
BACKEND_URL=https://backendbusinessapp.onrender.com
API_TIMEOUT=15000
FIREBASE_PROJECT_ID=businessapp-682eb
FIREBASE_AUTH_DOMAIN=businessapp-682eb.firebaseapp.com
FIREBASE_MESSAGING_SENDER_ID=88867405623
```

### `.env` (Production — change these)
```env
BACKEND_URL=https://your-production-api.com          # ← Your prod API
API_TIMEOUT=10000                                    # ← Shorter in prod
FIREBASE_PROJECT_ID=businessapp-682eb                # ← Same
FIREBASE_AUTH_DOMAIN=businessapp-682eb.firebaseapp.com
FIREBASE_MESSAGING_SENDER_ID=88867405623
```

> [!IMPORTANT]
> `react-native-config` reads `.env` at **build time**, not runtime.
> After changing `.env`, you must **rebuild the app** (not just reload Metro).
> For Android: `cd android && ./gradlew clean && cd ..` then re-run.

> [!TIP]
> To use **different backends per environment**, create:
> - `.env` → default (development)
> - `.env.staging` → staging server
> - `.env.production` → production server
> Then run: `ENVFILE=.env.production react-native run-android`

---

## 🚀 Running Commands

### First Time Setup
```powershell
# 1. Navigate to mobile project
cd c:\Users\vivek\OneDrive\Desktop\business_app\UI_Mobile

# 2. Install dependencies (already done)
npm install --legacy-peer-deps

# 3. For Android — sync gradle dependencies
cd android
./gradlew clean
cd ..
```

### Start Metro Bundler (Dev Server)
```powershell
# Standard start
npx react-native start

# Start with cache cleared (do this after changing .env or configs)
npx react-native start --reset-cache
```

### Run on Android
```powershell
# Run on connected device / emulator
npx react-native run-android

# Run in release mode (closer to production)
npx react-native run-android --mode=release
```

### Run on iOS (macOS only)
```powershell
# Install pods first (run once)
cd ios && pod install && cd ..

# Run on simulator
npx react-native run-ios
```

### TypeScript Check (no build needed)
```powershell
npx tsc --noEmit
```

### Lint Check
```powershell
npm run lint
```

---

## 📱 Development vs Production Settings

| Setting | Development | Production |
|---------|-------------|------------|
| `BACKEND_URL` | `https://backendbusinessapp.onrender.com` | Your production API URL |
| `API_TIMEOUT` | `15000` (15s — generous for slow dev) | `10000` (10s — tighter) |
| Metro Bundler | Running (`npx react-native start`) | Not needed |
| JS Bundle | Served from Metro live | Bundled into APK |
| Source Maps | Available | Minified (enable Sentry for tracking) |
| Logs | Visible in Metro terminal | Use Crashlytics/Sentry |
| OTP | Any 6-digit code works (backend dev mode) | Real Firebase OTP |

### Development — Keep These
- `.env` with render.com backend (already set)
- `__DEV__` checks can be added for extra logging
- Fast Refresh enabled by default in Metro

### Production — Change These
1. **Backend URL** → Your production server in `.env`
2. **Signing keystore** → Create `android/app/release.keystore`
3. **`android/app/build.gradle`** → Set `versionCode` and `versionName`
4. **Bundle ID** → Change `com.ui_mobile` in `android/app/build.gradle`
5. **App name** → Change in `android/app/src/main/res/values/strings.xml`
6. **Icons** → Replace in `android/app/src/main/res/mipmap-*/`

---

## 📦 Production Build (Android APK/AAB)

### Debug APK (for testing, not store)
```powershell
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK (for distribution)
```powershell
# Step 1: Generate signing keystore (one time)
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/release.keystore -alias businessapp -keyalg RSA -keysize 2048 -validity 10000

# Step 2: Add to android/gradle.properties
# MYAPP_RELEASE_STORE_FILE=release.keystore
# MYAPP_RELEASE_KEY_ALIAS=businessapp
# MYAPP_RELEASE_STORE_PASSWORD=yourpassword
# MYAPP_RELEASE_KEY_PASSWORD=yourpassword

# Step 3: Build
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Android App Bundle (for Google Play Store)
```powershell
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔑 Key Architecture Notes

### Token Flow
```
App starts → apiService.init() → AsyncStorage.getItem('auth_token')
           → if token found → GET /api/auth/me → restore session
           → if no token → show Landing screen
```

### Sidebar Navigation
- Swipe from left edge (50px) to open drawer
- Or tap the hamburger (≡) icon in header
- Role-based tab filtering in `DashboardNavigator.tsx`

### PDF Downloads
```
User taps "PDF" → apiService.openSalePdf(id)
               → builds URL: backend/api/sales/{id}/pdf?token={jwt}
               → Linking.openURL() → opens in device browser
```

### OTP Login (Current — No Firebase)
```
Enter phone → POST /api/auth/check-phone → check status
           → if active: show OTP field (mock: any 6 digits)
           → POST /api/auth/verify-otp → get JWT token
           → AsyncStorage.setItem('auth_token', token)
```

---

## 🐛 Common Issues & Fixes

### Metro won't start
```powershell
npx react-native start --reset-cache
```

### `@/` path aliases not resolving
Ensure `tsconfig.json` has `"baseUrl": "."` and `"paths": {"@/*": ["src/*"]}`.
Also ensure `babel.config.js` does NOT need a `module-resolver` plugin (Metro handles path aliases natively in RN 0.73+).

> [!WARNING]
> If `@/` imports still fail, add `babel-plugin-module-resolver`:
> ```powershell
> npm install --save-dev babel-plugin-module-resolver
> ```
> Then add to `babel.config.js`:
> ```js
> plugins: [
>   'nativewind/babel',
>   ['module-resolver', { root: ['./src'], alias: { '@': './src' } }],
>   'react-native-reanimated/plugin',
> ]
> ```

### NativeWind classes not applying
1. Check `metro.config.js` uses `withNativeWind(config, { input: './src/styles/global.css' })`
2. Check `global.css` has `@tailwind base; @tailwind components; @tailwind utilities;`
3. Reset cache: `npx react-native start --reset-cache`

### Android build fails (Gradle)
```powershell
cd android
./gradlew clean
cd ..
npx react-native run-android
```

### `react-native-reanimated` crash on start
Ensure `'react-native-reanimated/plugin'` is **last** in the babel plugins array.

### `react-native-gesture-handler` not working
Ensure `GestureHandlerRootView` wraps everything in `App.tsx` (already done).

---

## 🔮 Phase 2 — Future Improvements

| Feature | Library | Notes |
|---------|---------|-------|
| Firebase OTP | `@react-native-firebase/auth` | Requires `google-services.json` |
| Push Notifications | `@react-native-firebase/messaging` | For due alerts, order updates |
| Offline mode | `redux-persist` | Persist Redux state to AsyncStorage |
| Charts | `react-native-chart-kit` | Replace bar chart mockup in Hero |
| PDF Viewer | `react-native-pdf` | View PDF in-app instead of browser |
| Biometric Auth | `react-native-biometrics` | Fingerprint/FaceID login |
| Dark Mode | Add `dark:` Tailwind classes | Toggle via Redux uiSlice |
| Camera | `react-native-camera` | Scan barcodes for stock |

---

## 📋 Files Changed Summary

| File | Purpose |
|------|---------|
| `App.tsx` | Root wiring |
| `package.json` | 15+ new dependencies |
| `babel.config.js` | NativeWind + Reanimated plugins |
| `tailwind.config.js` | Color palette |
| `metro.config.js` | NativeWind processing |
| `tsconfig.json` | `@/` path aliases |
| `.env` / `.env.example` | Environment config |
| `src/config/index.ts` | Centralized env access |
| `src/types/index.ts` | 20+ TypeScript interfaces |
| `src/styles/global.css` | Tailwind entry |
| `src/services/apiService.ts` | 50+ API methods |
| `src/store/` | Redux store + 11 slices |
| `src/navigation/` | 3 navigators |
| `src/components/` | 10+ reusable components |
| `src/screens/` | 20 screens |
