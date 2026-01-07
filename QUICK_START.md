# 🚀 Quick Start - Build Your App

## 📱 Build Android APK

### Method 1: Using Build Script (Easiest)

Just double-click the file:

```
build-android.bat
```

This will automatically:

- Patch Java version
- Build web assets
- Sync Capacitor
- Build APK

APK will be at: `android\app\build\outputs\apk\debug\app-debug.apk`

### Method 2: Using NPM Scripts

```bash
npm run android:build
```

### Method 3: Manual Steps

```bash
npm run patch-java
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

---

## 🍎 iOS PWA - Already Working!

Your app is already configured for iOS! Users just need to:

1. **Open your website in Safari** (on iPhone/iPad)
2. **Tap Share button** (bottom toolbar)
3. **Tap "Add to Home Screen"**
4. **Tap "Add"**

Done! The app will appear on their home screen and work like a native app.

---

## 🔧 Before Building

Make sure:

- ✅ JAVA_HOME is set correctly (without `\bin`)
- ✅ Java JDK 17 is installed
- ✅ Run `npm install` first

---

## 📦 Build Release APK (For Production)

### First Time Setup

1. **Generate Keystore:**

```bash
cd android/app
keytool -genkey -v -keystore slink-release-key.keystore -alias slink-key -keyalg RSA -keysize 2048 -validity 10000
```

2. **Create `android/key.properties`:**

```properties
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=slink-key
storeFile=app/slink-release-key.keystore
```

3. **Build Release:**

```bash
build-android-release.bat
```

Or:

```bash
npm run android:release
```

---

## ✅ Testing

### Android APK

1. Copy APK to your Android phone
2. Enable "Install from Unknown Sources"
3. Install and test

### iOS PWA

1. Deploy to HTTPS server
2. Open in Safari on iPhone
3. Add to Home Screen
4. Test all features

---

## 🎯 Current Status

✅ **Android Build** - Ready (Java 17 configured)
✅ **iOS PWA** - Ready (manifest + meta tags configured)
✅ **Storage System** - Refactored (userId-based, multi-account support)
✅ **Private Keys** - Preserved on login
✅ **Push Notifications** - Configured (Android + Web)

---

## 🆘 Common Issues

### "JAVA_HOME is invalid"

Fix: Remove `\bin` from JAVA_HOME path

### "VERSION_21 error"

Fix: Run `npm run patch-java`

### "Gradle build failed"

Fix: Run `cd android && gradlew clean` then rebuild

### iOS not installing

Fix: Must use Safari browser (not Chrome)

---

## 📞 Need Help?

Check the detailed guides:

- `BUILD_GUIDE.md` - Complete build instructions
- `REFACTOR_COMPLETE.md` - Storage system documentation
- `cleanup-currentUserId.js` - Remove old storage key
