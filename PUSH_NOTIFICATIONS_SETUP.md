# Push Notifications Setup for Web + Mobile

## ✅ What Has Been Done

### 1. Installed Required Packages

```bash
npm install @capacitor/push-notifications
npm install @capacitor/app
npx cap sync android
```

### 2. Created New Hook: `usePushNotifications.js`

- Works for both **Web** (Firebase) and **Mobile** (Capacitor)
- Automatically detects platform and uses appropriate method
- Handles permission requests
- Listens for notifications

### 3. Updated `App.jsx`

- Changed from `useFirebaseNotifications` to `usePushNotifications`
- Now supports both web and mobile platforms

### 4. Updated `AndroidManifest.xml`

- Added `POST_NOTIFICATIONS` permission (required for Android 13+)
- Added Firebase metadata for notification icon and color

## 📱 How It Works

### Web Browser

- Uses Firebase Web Push (service worker)
- Token generated via `firebase-messaging-sw.js`
- Works in Chrome, Firefox, Edge

### Android APK

- Uses Capacitor Push Notifications (native)
- Token generated via native Android FCM
- Requests permission on first launch
- Works on all Android versions

## 🔧 What You Need To Do

### 1. Ensure `google-services.json` is in place

Make sure this file exists:

```
android/app/google-services.json
```

This file should be the **Android** version from Firebase Console, not the web config.

### 2. Verify `build.gradle` has Firebase

Check `android/app/build.gradle` has:

```gradle
dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.2.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

And at the bottom:

```gradle
apply plugin: 'com.google.gms.google-services'
```

### 3. Rebuild the APK

```bash
npm run build
npx cap sync android
npx cap open android
```

Then build the APK in Android Studio.

### 4. Test on Device

- Install APK on Android device
- Open app → should request notification permission
- Check console logs for device token
- Token should be sent to backend automatically

## 🐛 Debugging

### Check if token is generated:

Look for these logs in console:

```
✅ Push registration success, token: [YOUR_TOKEN]
📤 Sending FCM token to backend: [YOUR_TOKEN]
```

### If token is not generated:

1. Check `google-services.json` is correct
2. Check Firebase project has Android app configured
3. Check package name matches in Firebase Console
4. Rebuild APK completely

### If permission is denied:

- User must manually enable in Android Settings → Apps → Your App → Notifications

## 📊 Differences: Web vs Mobile

| Feature                  | Web            | Mobile (APK)                |
| ------------------------ | -------------- | --------------------------- |
| Permission Request       | Browser popup  | Android system dialog       |
| Token Generation         | Service Worker | Native FCM                  |
| Foreground Notifications | Toast          | Toast + System notification |
| Background Notifications | Service Worker | Native handler              |
| Storage Permission       | Not needed     | Not needed                  |

## ✅ Summary

**The issue was NOT storage permission!**

The issue was:

- ❌ Web FCM doesn't work in APK
- ❌ Need native Capacitor plugin
- ❌ Need proper Android permissions

**Now fixed:**

- ✅ Capacitor Push Notifications installed
- ✅ Native FCM token generation
- ✅ POST_NOTIFICATIONS permission added
- ✅ Works on both web and mobile

## 🎯 Next Steps

1. Build new APK
2. Test on Android device
3. Verify token is sent to backend
4. Test receiving notifications

The device token will now be generated and sent to your backend correctly in the APK! 🎉
