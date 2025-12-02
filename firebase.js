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

// Check if browser supports FCM (not available on iOS Safari)
const isFCMSupported = () => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
};

// Ensure Service Worker exists & browser supports notifications
if (isFCMSupported()) {
  try {
    messaging = getMessaging(app);
    console.log("✅ Firebase Cloud Messaging initialized");
  } catch (error) {
    console.warn("⚠️ Firebase Messaging init error:", error.message);
    messaging = null; // Ensure it's null on error
  }
} else {
  console.warn(
    "⚠️ Firebase Cloud Messaging not supported on this browser (iOS Safari)"
  );
  messaging = null;
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
    // Check if Notification API is available
    if (typeof Notification === "undefined") {
      console.warn("Notification API not available");
      return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied.");
      return null;
    }

    console.log("Notification permission granted.");

    // Wait for service worker to be ready
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        console.log(
          "✅ Service Worker is ready for FCM:",
          registration.active?.state
        );
      } catch (swError) {
        console.error("❌ Service Worker not ready:", swError);
        return null;
      }
    }

    // Small delay to ensure service worker is fully active
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get FCM token with VAPID key
    try {
      const token = await getToken(messaging, {
        vapidKey:
          "BJksXRI_KpsnAN8FUV9kmaEbI2MEhlvFYG4diMmSn1GU7F46bUXtsqbH5pqjnlXSLpMZbmEUz7_0TYYLeJb-6fg",
        serviceWorkerRegistration: await navigator.serviceWorker.ready,
      });

      console.log("✅ FCM Token generated:", token);
      return token;
    } catch (tokenError) {
      console.error("❌ Error getting FCM token:", tokenError);

      // More detailed error logging
      if (tokenError.code === "messaging/token-subscribe-failed") {
        console.error("❌ Push subscription failed. Possible causes:");
        console.error("   1. Invalid VAPID key");
        console.error("   2. Service worker not properly registered");
        console.error("   3. Browser doesn't support push notifications");
      } else if (tokenError.code === "messaging/permission-blocked") {
        console.error("❌ Notification permission blocked by user.");
      }

      return null;
    }
  } catch (error) {
    console.error("❌ Error retrieving FCM token:", error);
    return null;
  }
};

// ----------------------------
// FOREGROUND MESSAGE LISTENER
// ----------------------------
export const onMessageListener = () =>
  new Promise((resolve, reject) => {
    if (!messaging) {
      console.warn("Messaging not available.");
      reject(new Error("Messaging not available"));
      return;
    }

    try {
      onMessage(messaging, (payload) => {
        try {
          console.log("Foreground message received:", payload);
          resolve(payload);
        } catch (error) {
          console.error("❌ Error processing foreground message:", error);
          reject(error);
        }
      });
    } catch (error) {
      console.error("❌ Error setting up message listener:", error);
      reject(error);
    }
  });

// ----------------------------
// EXPORTS
// ----------------------------
export { app, messaging, analytics };
export default app;
