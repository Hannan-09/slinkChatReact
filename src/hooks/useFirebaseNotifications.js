// useFirebaseNotifications.js

import { useEffect, useState } from "react";
import {
  requestNotificationPermission,
  onMessageListener,
} from "../../firebase";
import { useToast } from "../contexts/ToastContext";

// Check if Notification API is supported (not available on iOS Safari)
const isNotificationSupported = () => {
  return typeof window !== "undefined" && "Notification" in window;
};

export const useFirebaseNotifications = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(
    isNotificationSupported() ? Notification.permission : "unsupported"
  );

  const toast = useToast();

  // ----------------------------------------
  // 1. Request notification permissions on mount
  // ----------------------------------------
  useEffect(() => {
    // Skip if Notification API is not supported (iOS Safari)
    if (!isNotificationSupported()) {
      console.warn(
        "⚠️ Notification API not supported on this browser (iOS Safari)"
      );
      return;
    }

    const initializeNotifications = async () => {
      try {
        const token = await requestNotificationPermission();

        if (token) {
          setFcmToken(token);
          console.log("FCM Token:", token);

          // TODO: send this token to backend
          // await sendTokenToBackend(token)
        }

        setNotificationPermission(Notification.permission);
      } catch (err) {
        console.error("Error initializing Firebase notifications:", err);
      }
    };

    initializeNotifications();
  }, []);

  // ----------------------------------------
  // 2. Listen to foreground messages
  // ----------------------------------------
  useEffect(() => {
    // Skip if Notification API is not supported (iOS Safari)
    if (!isNotificationSupported()) {
      return;
    }

    const unsubscribe = onMessageListener()
      .then((payload) => {
        console.log("Foreground notification:", payload);

        const title = payload.notification?.title || "Notification";
        const body = payload.notification?.body || "";

        toast.info(`${title}: ${body}`);

        // Dispatch event so any component can use it
        window.dispatchEvent(
          new CustomEvent("fcmMessage", { detail: payload })
        );
      })
      .catch((err) => console.error("Foreground listener failed:", err));

    return () => {
      // Cleanup if needed
      // (Listener in firebase.js handles unsubscribe internally)
    };
  }, [toast]);

  // ----------------------------------------
  // 3. Manual permission requester
  // ----------------------------------------
  const requestPermission = async () => {
    if (!isNotificationSupported()) {
      console.warn("⚠️ Notification API not supported on this browser");
      return null;
    }

    const token = await requestNotificationPermission();
    if (token) {
      setFcmToken(token);
      setNotificationPermission(Notification.permission);
    }
    return token;
  };

  return {
    fcmToken,
    notificationPermission,
    requestPermission,
    isPermissionGranted: notificationPermission === "granted",
    isSupported: isNotificationSupported(),
  };
};

export default useFirebaseNotifications;
