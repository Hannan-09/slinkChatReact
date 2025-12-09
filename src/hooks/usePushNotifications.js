// usePushNotifications.js - Works for both Web and Mobile (Capacitor)

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import {
  requestNotificationPermission,
  onMessageListener,
} from "../../firebase";
import { useToast } from "../contexts/ToastContext";

// Check if running on native platform
const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

// Check if Notification API is supported (web only)
const isNotificationSupported = () => {
  return typeof window !== "undefined" && "Notification" in window;
};

export const usePushNotifications = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const toast = useToast();

  // ----------------------------------------
  // Initialize Push Notifications
  // ----------------------------------------
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        if (isNativePlatform()) {
          // Native Mobile (Android/iOS)
          console.log("📱 Initializing native push notifications");
          await initializeNativePush();
        } else if (isNotificationSupported()) {
          // Web Browser
          console.log("🌐 Initializing web push notifications");
          await initializeWebPush();
        } else {
          console.warn("⚠️ Push notifications not supported on this platform");
        }
      } catch (error) {
        console.error("❌ Error initializing notifications:", error);
        // Don't crash app - continue without push notifications
      }
    };

    initializeNotifications();

    // Cleanup
    return () => {
      try {
        if (isNativePlatform()) {
          PushNotifications.removeAllListeners();
        }
      } catch (error) {
        console.error("❌ Error removing listeners:", error);
      }
    };
  }, []);

  // ----------------------------------------
  // Native Push (Capacitor)
  // ----------------------------------------
  const initializeNativePush = async () => {
    try {
      console.log("📱 Starting native push initialization...");

      // Check if PushNotifications is available
      if (!PushNotifications) {
        console.error("❌ PushNotifications plugin not available");
        return;
      }

      // Check permission status
      let permStatus = await PushNotifications.checkPermissions();
      console.log("📱 Current permission status:", permStatus.receive);

      // Request permission if needed
      if (
        permStatus.receive === "prompt" ||
        permStatus.receive === "prompt-with-rationale"
      ) {
        try {
          permStatus = await PushNotifications.requestPermissions();
          console.log("📱 Permission request result:", permStatus.receive);
        } catch (permError) {
          console.error("❌ Error requesting permissions:", permError);
          setNotificationPermission("denied");
          return;
        }
      }

      if (permStatus.receive !== "granted") {
        console.error("❌ Push notification permission not granted");
        setNotificationPermission("denied");
        return;
      }

      setNotificationPermission("granted");

      // Register for push notifications with error handling
      try {
        await PushNotifications.register();
        console.log("✅ Registered for push notifications");
      } catch (registerError) {
        console.error(
          "❌ Error registering for push notifications:",
          registerError
        );
        // Don't crash - continue without push notifications
        return;
      }

      // Listen for registration success with error handling
      try {
        PushNotifications.addListener("registration", (token) => {
          try {
            console.log("✅ Push registration success, token:", token.value);
            setFcmToken(token.value);
          } catch (tokenError) {
            console.error("❌ Error handling registration token:", tokenError);
          }
        });
      } catch (listenerError) {
        console.error("❌ Error adding registration listener:", listenerError);
      }

      // Listen for registration errors with error handling
      try {
        PushNotifications.addListener("registrationError", (error) => {
          console.error("❌ Push registration error:", error);
        });
      } catch (listenerError) {
        console.error(
          "❌ Error adding registrationError listener:",
          listenerError
        );
      }

      // Listen for push notifications received with error handling
      try {
        PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            try {
              console.log("📨 Push notification received:", notification);

              // Show toast for foreground notifications
              if (notification.title && notification.body && toast) {
                toast.info(`${notification.title}: ${notification.body}`);
              }
            } catch (notifError) {
              console.error(
                "❌ Error handling received notification:",
                notifError
              );
            }
          }
        );
      } catch (listenerError) {
        console.error(
          "❌ Error adding pushNotificationReceived listener:",
          listenerError
        );
      }

      // Listen for notification actions (when user taps notification) with error handling
      try {
        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (notification) => {
            try {
              console.log(
                "👆 Push notification action performed:",
                notification
              );

              // Handle notification tap - navigate to appropriate screen
              if (
                notification &&
                notification.notification &&
                notification.notification.data
              ) {
                const data = notification.notification.data;
                if (data.type) {
                  handleNotificationTap(data);
                }
              }
            } catch (actionError) {
              console.error(
                "❌ Error handling notification action:",
                actionError
              );
            }
          }
        );
      } catch (listenerError) {
        console.error(
          "❌ Error adding pushNotificationActionPerformed listener:",
          listenerError
        );
      }
    } catch (error) {
      console.error("❌ Error initializing native push:", error);
      // Don't crash app - continue without push notifications
    }
  };

  // ----------------------------------------
  // Web Push (Firebase)
  // ----------------------------------------
  const initializeWebPush = async () => {
    try {
      const token = await requestNotificationPermission();

      if (token) {
        setFcmToken(token);
        console.log("✅ Web FCM Token:", token);
      }

      if (typeof Notification !== "undefined") {
        setNotificationPermission(Notification.permission);
      }

      // Listen for foreground messages
      try {
        onMessageListener()
          .then((payload) => {
            try {
              console.log("📨 Foreground message received:", payload);

              if (payload && payload.notification && toast) {
                toast.info(
                  `${payload.notification.title}: ${payload.notification.body}`
                );
              }
            } catch (payloadError) {
              console.error(
                "❌ Error handling foreground message:",
                payloadError
              );
            }
          })
          .catch((err) =>
            console.error("❌ Error listening for messages:", err)
          );
      } catch (listenerError) {
        console.error("❌ Error setting up message listener:", listenerError);
      }
    } catch (error) {
      console.error("❌ Error initializing web push:", error);
      // Don't crash app - continue without web push
    }
  };

  // ----------------------------------------
  // Handle notification tap
  // ----------------------------------------
  const handleNotificationTap = (data) => {
    try {
      console.log("👆 Handling notification tap:", data);
      console.log("👆 Notification data:", JSON.stringify(data, null, 2));

      // Store notification data in sessionStorage for App.jsx to handle
      // This allows navigation after app is fully loaded
      if (data) {
        sessionStorage.setItem(
          "pendingNotificationNavigation",
          JSON.stringify(data)
        );
        console.log("✅ Stored notification data for navigation");

        // Trigger a custom event to notify the app
        window.dispatchEvent(
          new CustomEvent("notificationTap", { detail: data })
        );
      }
    } catch (error) {
      console.error("❌ Error handling notification tap:", error);
    }
  };

  return {
    fcmToken,
    notificationPermission,
    isNative: isNativePlatform(),
  };
};
