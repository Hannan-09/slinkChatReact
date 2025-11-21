// useFirebaseNotifications.js

import { useEffect, useState } from "react";
import {
  requestNotificationPermission,
  onMessageListener,
} from "../../firebase";
import { useToast } from "../contexts/ToastContext";

export const useFirebaseNotifications = () => {
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof window !== "undefined" ? Notification.permission : "default"
  );

  const toast = useToast();

  // ----------------------------------------
  // 1. Request notification permissions on mount
  // ----------------------------------------
  useEffect(() => {
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
  };
};

export default useFirebaseNotifications;
