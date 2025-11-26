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
    };

    initializeNotifications();

    // Cleanup
    return () => {
      if (isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, []);

  // ----------------------------------------
  // Native Push (Capacitor)
  // ----------------------------------------
  const initializeNativePush = async () => {
    try {
      // Check permission status
      let permStatus = await PushNotifications.checkPermissions();
      console.log("📱 Current permission status:", permStatus.receive);

      // Request permission if needed
      if (
        permStatus.receive === "prompt" ||
        permStatus.receive === "prompt-with-rationale"
      ) {
        permStatus = await PushNotifications.requestPermissions();
        console.log("📱 Permission request result:", permStatus.receive);
      }

      if (permStatus.receive !== "granted") {
        console.error("❌ Push notification permission not granted");
        setNotificationPermission("denied");
        return;
      }

      setNotificationPermission("granted");

      // Register for push notifications
      await PushNotifications.register();
      console.log("✅ Registered for push notifications");

      // Listen for registration success
      PushNotifications.addListener("registration", (token) => {
        console.log("✅ Push registration success, token:", token.value);
        setFcmToken(token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener("registrationError", (error) => {
        console.error("❌ Push registration error:", error);
      });

      // Listen for push notifications received
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          console.log("📨 Push notification received:", notification);

          // Show toast for foreground notifications
          if (notification.title && notification.body) {
            toast.info(`${notification.title}: ${notification.body}`);
          }
        }
      );

      // Listen for notification actions (when user taps notification)
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (notification) => {
          console.log("👆 Push notification action performed:", notification);

          // Handle notification tap - navigate to appropriate screen
          const data = notification.notification.data;
          if (data && data.type) {
            handleNotificationTap(data);
          }
        }
      );
    } catch (error) {
      console.error("❌ Error initializing native push:", error);
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

      setNotificationPermission(Notification.permission);

      // Listen for foreground messages
      onMessageListener()
        .then((payload) => {
          console.log("📨 Foreground message received:", payload);

          if (payload.notification) {
            toast.info(
              `${payload.notification.title}: ${payload.notification.body}`
            );
          }
        })
        .catch((err) => console.error("❌ Error listening for messages:", err));
    } catch (error) {
      console.error("❌ Error initializing web push:", error);
    }
  };

  // ----------------------------------------
  // Handle notification tap
  // ----------------------------------------
  const handleNotificationTap = (data) => {
    console.log("👆 Handling notification tap:", data);

    // You can add navigation logic here based on notification type
    // Example:
    // if (data.type === 'chat_message') {
    //   navigate(`/chat/${data.chatRoomId}`);
    // }
  };

  return {
    fcmToken,
    notificationPermission,
    isNative: isNativePlatform(),
  };
};
