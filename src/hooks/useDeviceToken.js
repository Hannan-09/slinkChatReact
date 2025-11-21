// registerDeviceToken.js
import { messaging } from "../../firebase";
import { getToken } from "firebase/messaging";

export async function registerDeviceToken(userId) {
  try {
    if (!messaging) {
      console.warn("Messaging not initialized — no SW or browser support");
      return null;
    }

    // Get token with your VAPID key
    const token = await getToken(messaging, {
      vapidKey:
        "BODkRYV046nuxt7iBLNxsXTdB6CIb7Tnf-kCUSXQBAW4fXadzOxMJwUrUFa5FHsG6-jk-b50FjLOwXJSrkioVgg",
    });

    if (!token) {
      console.warn("Failed to get FCM token.");
      return null;
    }

    console.log("Device token:", token);

    // Send token to backend
    await fetch("/api/save-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, token }),
    });

    return token;
  } catch (err) {
    console.error("Token error:", err);
    return null;
  }
}
