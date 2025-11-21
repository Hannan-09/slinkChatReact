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
  const notificationOptions = {
    body: payload.notification?.body || "You have a new message",
    icon: payload.notification?.icon || "/vite.svg",
    badge: "/vite.svg",
    tag: payload.data?.chatRoomId || "default",
    data: payload.data,
    requireInteraction: false,
    vibrate: [200, 100, 200],
  };

  return self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[firebase-messaging-sw.js] Notification clicked:", event);

  event.notification.close();

  // Get the chat room ID from notification data
  const chatRoomId = event.notification.data?.chatRoomId;
  const url = chatRoomId ? `/chat/${chatRoomId}` : "/chats";

  // Open or focus the app
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Open new window if app is not open
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
