// Firebase Cloud Messaging Service Worker

// Give the service worker access to Firebase Messaging.
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js"
);

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDh3KId5fjvpbPbdRpL9VWs5ZDiKySbOgY",
  authDomain: "slinkchat-ea24d.firebaseapp.com",
  projectId: "slinkchat-ea24d",
  storageBucket: "slinkchat-ea24d.firebasestorage.app",
  messagingSenderId: "18734173510",
  appId: "1:18734173510:web:35a190faac798cea95a947",
  measurementId: "G-1BKMC2T506",
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message:",
    payload
  );

  const notificationTitle = payload.notification?.title || "New Message";

  // Merge notification data with payload data for proper navigation
  const notificationData = {
    ...payload.data,
    type: payload.data?.type || "message",
    chatRoomId: payload.data?.chatRoomId || payload.data?.chat_room_id,
    senderId: payload.data?.senderId || payload.data?.sender_id,
    senderName:
      payload.data?.senderName ||
      payload.data?.sender_name ||
      payload.notification?.title,
    senderProfile: payload.data?.senderProfile || payload.data?.sender_profile,
  };

  const notificationOptions = {
    body: payload.notification?.body || "You have a new message",
    icon: payload.notification?.icon || "/vite.svg",
    badge: "/vite.svg",
    tag: notificationData.chatRoomId || "default",
    data: notificationData,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  console.log(
    "[firebase-messaging-sw.js] Notification data:",
    notificationData
  );

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification clicked:", event);
  console.log(
    "[firebase-messaging-sw.js] Notification data:",
    event.notification.data
  );

  event.notification.close();

  // Get notification data
  const data = event.notification.data || {};
  const type = data.type || "message";

  // Determine URL based on notification type
  let url = "/chats";
  if (type === "message" || type === "chat_message") {
    if (data.chatRoomId) {
      const senderName = encodeURIComponent(data.senderName || "User");
      const senderProfile = encodeURIComponent(data.senderProfile || "");
      const senderId = data.senderId || "";
      url = `/chat/${data.chatRoomId}?name=${senderName}&avatar=${senderProfile}&receiverId=${senderId}`;
    }
  } else if (type === "call" || type === "incoming_call") {
    url = "/incoming-call";
  } else if (type === "chat_request") {
    url = "/requests";
  } else if (type === "request_accepted") {
    url = "/chats";
  }

  console.log("[firebase-messaging-sw.js] Navigating to:", url);

  // Store notification data for app to handle navigation
  const notificationData = JSON.stringify(data);

  // Open or focus the app
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if ("focus" in client) {
            // Send message to client to handle navigation
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              data: data,
            });
            return client.focus();
          }
        }
        // Open new window if app is not open
        if (clients.openWindow) {
          // Store data in URL hash for retrieval after app loads
          return clients.openWindow(
            url + "#notification=" + encodeURIComponent(notificationData)
          );
        }
      })
  );
});
