# Build Guide - Android APK & iOS PWA

## 📱 Android APK Build

### Prerequisites

- Java JDK 17 installed
- Android Studio installed (or Android SDK)
- JAVA_HOME set correctly (without `\bin` at the end)

### Step 1: Build Web Assets

```bash
npm run build
```

This creates the `dist` folder with your web app.

### Step 2: Sync Capacitor

```bash
npx cap sync android
```

This copies the web assets to the Android project.

### Step 3: Open in Android Studio (Optional)

```bash
npx cap open android
```

Or manually open the `android` folder in Android Studio.

### Step 4: Build APK

#### Option A: Using Gradle (Command Line)

```bash
cd android
./gradlew assembleDebug
```

The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Option B: Using Android Studio

1. Open the `android` folder in Android Studio
2. Go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
3. Wait for build to complete
4. Click "locate" to find the APK

### Step 5: Build Release APK (Production)

#### Generate Keystore (First Time Only)

```bash
cd android/app
keytool -genkey -v -keystore slink-release-key.keystore -alias slink-key -keyalg RSA -keysize 2048 -validity 10000
```

#### Configure Signing

Create `android/key.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=slink-key
storeFile=app/slink-release-key.keystore
```

#### Build Release APK

```bash
cd android
./gradlew assembleRelease
```

The release APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Common Build Issues

#### Issue 1: JAVA_HOME Error

```
ERROR: JAVA_HOME is set to an invalid directory
```

**Fix:** Remove `\bin` from JAVA_HOME path

- Should be: `C:\Program Files\Java\jdk-17`
- Not: `C:\Program Files\Java\jdk-17\bin`

#### Issue 2: Java Version Error

```
No such property: VERSION_21
```

**Fix:** Run the patch script

```bash
npm run patch-java
```

#### Issue 3: Gradle Build Failed

**Fix:** Clean and rebuild

```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

---

## 🍎 iOS PWA (Progressive Web App)

Your app already has iOS PWA support! Here's how it works:

### Features Implemented

1. **iOS Detection** ✅

   - Detects iPhone/iPad/iPod devices
   - Shows install guide for iOS users
   - Located in: `src/pages/IosInstallGuide.jsx`

2. **PWA Manifest** ✅

   - Configured in: `public/manifest.json`
   - App name: SlinkChat
   - Display mode: standalone (looks like native app)
   - Theme color: #ff6b35
   - Background: #1a1a1a

3. **Service Worker** ✅
   - Firebase messaging service worker
   - Located in: `public/firebase-messaging-sw.js`

### How Users Install on iOS

1. **Open in Safari** (must use Safari, not Chrome)

   - Navigate to your website URL

2. **Tap Share Button**

   - Bottom toolbar, square with arrow pointing up

3. **Add to Home Screen**

   - Scroll down in share menu
   - Tap "Add to Home Screen"

4. **Confirm**
   - Tap "Add" in top right
   - App icon appears on home screen

### Testing iOS PWA

1. **Deploy your app** to a web server (must be HTTPS)
2. **Open in Safari** on iPhone/iPad
3. **Follow install steps** above
4. **Launch from home screen** - should open in standalone mode

### iOS PWA Limitations

- No push notifications (iOS Safari limitation)
- No background sync
- Limited file system access
- Must use Safari for installation

### Improving iOS PWA

#### Add Better Icons

Replace `public/vite.svg` with proper PNG icons:

- 192x192 for standard icon
- 512x512 for splash screen
- Use PNG format (not SVG) for better iOS compatibility

#### Add Apple-Specific Meta Tags

In `index.html`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta
  name="apple-mobile-web-app-status-bar-style"
  content="black-translucent"
/>
<meta name="apple-mobile-web-app-title" content="SlinkChat" />
<link rel="apple-touch-icon" href="/icon-192.png" />
<link rel="apple-touch-startup-image" href="/splash-screen.png" />
```

---

## 🚀 Deployment Checklist

### Before Building

- [ ] Update version in `package.json`
- [ ] Update version in `capacitor.config.json`
- [ ] Test all features work
- [ ] Check all localStorage refactoring works
- [ ] Test login/logout flow
- [ ] Test private key encryption
- [ ] Test multiple user accounts

### Android APK

- [ ] Build web assets (`npm run build`)
- [ ] Sync Capacitor (`npx cap sync android`)
- [ ] Run patch script (`npm run patch-java`)
- [ ] Build APK (`./gradlew assembleDebug`)
- [ ] Test APK on device
- [ ] Build release APK for production

### iOS PWA

- [ ] Deploy to HTTPS server
- [ ] Test in Safari on iPhone
- [ ] Test "Add to Home Screen"
- [ ] Test standalone mode
- [ ] Verify icons display correctly
- [ ] Test all features in PWA mode

---

## 📦 Distribution

### Android APK

- Upload to Google Play Store
- Or distribute directly (enable "Unknown Sources" on device)

### iOS PWA

- Deploy to web server with HTTPS
- Share URL with users
- Users install via Safari "Add to Home Screen"

---

## 🔧 Quick Commands Reference

```bash
# Install dependencies
npm install

# Patch Java version issue
npm run patch-java

# Build web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK
cd android && ./gradlew assembleRelease

# Clean build
cd android && ./gradlew clean
```

---

## 📝 Notes

- Android APK works on Android 6.0+ (API 23+)
- iOS PWA works on iOS 11.3+ (Safari)
- Both support offline functionality
- Both support push notifications (Android only for PWA)
- Storage refactoring supports multiple accounts on both platforms
