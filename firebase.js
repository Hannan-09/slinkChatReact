// firebase.js

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

// ----------------------------
// YOUR FIREBASE PROJECT CONFIG
// ----------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDh3KId5fjvpbPbdRpL9VWs5ZDiKySbOgY",
  authDomain: "slinkchat-ea24d.firebaseapp.com",
  projectId: "slinkchat-ea24d",
  storageBucket: "slinkchat-ea24d.firebasestorage.app",
  messagingSenderId: "18734173510",
  appId: "1:18734173510:web:35a190faac798cea95a947",
  measurementId: "G-1BKMC2T506",
};

// ----------------------------
// INIT FIREBASE APP
// ----------------------------
const app = initializeApp(firebaseConfig);

// ----------------------------
// ANALYTICS (Browser Only)
// ----------------------------
let analytics = null;
if (typeof window !== "undefined") {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics not supported in this environment.");
  }
}

// ----------------------------
// FIREBASE CLOUD MESSAGING
// ----------------------------
let messaging = null;

// Ensure Service Worker exists & browser supports notifications
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Firebase Messaging init error:", error);
  }
}

// ----------------------------
// REQUEST PERMISSION + GET TOKEN
// ----------------------------
export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.warn("Firebase messaging not available.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied.");
      return null;
    }

    console.log("Notification permission granted.");

    // Wait for service worker to be ready
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      console.log(
        "✅ Service Worker is ready for FCM:",
        registration.active?.state
      );
    }

    // Small delay to ensure service worker is fully active
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get FCM token with VAPID key
    const token = await getToken(messaging, {
      vapidKey:
        "BODkRYV046nuxt7iBLNxsXTdB6CIb7Tnf-kCUSXQBAW4fXadzOxMJwUrUFa5FHsG6-jk-b50FjLOwXJSrkioVgg",
      serviceWorkerRegistration: await navigator.serviceWorker.ready,
    });

    console.log("✅ FCM Token generated:", token);
    return token;
  } catch (error) {
    console.error("❌ Error retrieving FCM token:", error);

    // More detailed error logging
    if (error.code === "messaging/token-subscribe-failed") {
      console.error("❌ Push subscription failed. Possible causes:");
      console.error("   1. Invalid VAPID key");
      console.error("   2. Service worker not properly registered");
      console.error("   3. Browser doesn't support push notifications");
    } else if (error.code === "messaging/permission-blocked") {
      console.error("❌ Notification permission blocked by user.");
    }

    return null;
  }
};

// ----------------------------
// FOREGROUND MESSAGE LISTENER
// ----------------------------
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      console.warn("Messaging not available.");
      return;
    }

    onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      resolve(payload);
    });
  });

// ----------------------------
// EXPORTS
// ----------------------------
export { app, messaging, analytics };
export default app;
