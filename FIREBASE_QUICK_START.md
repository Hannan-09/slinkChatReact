# 🚀 Firebase Notifications - Quick Start

## What I Found & Fixed

### ✅ Your Existing Setup (Good):

- Firebase config in `firebase.js` ✅
- Service Worker in `public/firebase-messaging-sw.js` ✅
- React hooks created ✅
- Firebase initialized ✅

### ❌ What Was Missing (Now Fixed):

- Service Worker wasn't registered → **FIXED** in `main.jsx`
- Firebase notifications not used in app → **FIXED** in `App.jsx`
- No auto-send FCM token to backend → **FIXED** in `App.jsx`

## 🎯 What YOU Need to Do Now

### 1. Get VAPID Key (5 minutes)

```
1. Go to: https://console.firebase.google.com/
2. Select project: slinkchat-ea24d
3. Settings ⚙️ → Cloud Messaging → Web Push certificates
4. Click "Generate key pair"
5. Copy the key (starts with "B...")
```

### 2. Replace VAPID Key in 2 Files

**File 1:** `firebase.js` (line ~73)

```javascript
vapidKey: "BPasteYourKeyHere...",
```

**File 2:** `src/hooks/useDeviceToken.js` (line ~13)

```javascript
vapidKey: "BPasteYourKeyHere...",
```

### 3. Create Backend Endpoint

**Endpoint:** `POST /api/v1/users/{userId}/fcm-token`

**Request:**

```json
{
  "fcmToken": "string"
}
```

**Java Example:**

```java
@PostMapping("/{userId}/fcm-token")
public ResponseEntity<?> saveFcmToken(
    @PathVariable Long userId,
    @RequestBody Map<String, String> request
) {
    String fcmToken = request.get("fcmToken");
    userService.saveFcmToken(userId, fcmToken);
    return ResponseEntity.ok("Token saved");
}
```

### 4. Setup Firebase Admin SDK (Backend)

**Add dependency:**

```xml
<dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.2.0</version>
</dependency>
```

**Download service account key:**

1. Firebase Console → Settings → Service Accounts
2. Click "Generate new private key"
3. Save JSON file to `src/main/resources/`

**Initialize:**

```java
@PostConstruct
public void initialize() {
    FileInputStream serviceAccount = new FileInputStream(
        "src/main/resources/firebase-service-account.json"
    );
    FirebaseOptions options = FirebaseOptions.builder()
        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
        .build();
    FirebaseApp.initializeApp(options);
}
```

### 5. Send Notifications from Backend

```java
public void sendNotification(String fcmToken, String title, String body, Long chatRoomId) {
    Message message = Message.builder()
        .setToken(fcmToken)
        .setNotification(Notification.builder()
            .setTitle(title)
            .setBody(body)
            .build())
        .putData("chatRoomId", chatRoomId.toString())
        .build();

    FirebaseMessaging.getInstance().send(message);
}
```

## 🧪 Testing

### Test 1: Check Service Worker

1. Open browser DevTools → Console
2. Look for: `✅ Service Worker registered`

### Test 2: Check FCM Token

1. Open browser DevTools → Console
2. Look for: `FCM Token: ...`
3. Copy this token

### Test 3: Test from Firebase Console

1. Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Click "Send test message"
4. Paste your FCM token
5. Click "Test"

### Test 4: Test from Backend

Create a test endpoint:

```java
@GetMapping("/test-notification/{userId}")
public String testNotification(@PathVariable Long userId) {
    String fcmToken = userService.getFcmToken(userId);
    sendNotification(fcmToken, "Test", "Hello!", 123L);
    return "Sent!";
}
```

## 📋 Checklist

- [ ] Got VAPID key from Firebase Console
- [ ] Updated VAPID key in `firebase.js`
- [ ] Updated VAPID key in `src/hooks/useDeviceToken.js`
- [ ] Created backend endpoint `/users/{userId}/fcm-token`
- [ ] Added Firebase Admin SDK dependency
- [ ] Downloaded service account JSON
- [ ] Initialized Firebase Admin in backend
- [ ] Created notification sending service
- [ ] Tested with Firebase Console
- [ ] Tested from backend

## 🎉 Done!

Once you complete the checklist, notifications will work:

- ✅ User logs in → FCM token sent to backend automatically
- ✅ New message arrives → Backend sends push notification
- ✅ User clicks notification → Opens specific chat
- ✅ Foreground notifications → Shows toast
- ✅ Background notifications → Shows system notification

## 📚 Full Documentation

See `FIREBASE_NOTIFICATION_SETUP.md` for complete details, code examples, and troubleshooting.
