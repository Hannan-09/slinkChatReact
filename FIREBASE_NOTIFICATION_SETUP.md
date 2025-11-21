# 🔔 Firebase Push Notifications Setup Guide

## Current Status

### ✅ What's Already Done:

1. ✅ Firebase initialized in `firebase.js`
2. ✅ Service Worker created in `public/firebase-messaging-sw.js`
3. ✅ React hooks created (`useFirebaseNotifications.js`, `useDeviceToken.js`)
4. ✅ Service Worker registered in `main.jsx`
5. ✅ Firebase notifications integrated in `App.jsx`
6. ✅ Auto-send FCM token to backend when user logs in

### ❌ What's Missing (YOU NEED TO DO):

## Step 1: Get VAPID Key from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **slinkchat-ea24d**
3. Click the ⚙️ gear icon → **Project Settings**
4. Go to **Cloud Messaging** tab
5. Scroll down to **Web Push certificates**
6. Click **Generate key pair** button
7. Copy the generated key (starts with `B...`)

## Step 2: Update VAPID Key in Your Code

Replace `YOUR_VAPID_KEY_HERE` in these 3 files:

### File 1: `firebase.js` (line 73)

```javascript
const token = await getToken(messaging, {
  vapidKey: "BPasteYourActualVapidKeyHere...",
});
```

### File 2: `src/hooks/useDeviceToken.js` (line 13)

```javascript
const token = await getToken(messaging, {
  vapidKey: "BPasteYourActualVapidKeyHere...",
});
```

## Step 3: Backend API Endpoint

Your backend needs to have this endpoint to receive FCM tokens:

### Endpoint: `POST /api/v1/users/{userId}/fcm-token`

**Request Body:**

```json
{
  "fcmToken": "string"
}
```

**Headers:**

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Example Java/Spring Boot Controller:

```java
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @PostMapping("/{userId}/fcm-token")
    public ResponseEntity<?> saveFcmToken(
        @PathVariable Long userId,
        @RequestBody Map<String, String> request,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        String fcmToken = request.get("fcmToken");

        // Save token to database
        userService.saveFcmToken(userId, fcmToken);

        return ResponseEntity.ok(Map.of("message", "FCM token saved successfully"));
    }
}
```

### Database Schema:

```sql
ALTER TABLE users ADD COLUMN fcm_token VARCHAR(255);
```

Or create a separate table:

```sql
CREATE TABLE user_fcm_tokens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    fcm_token VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_user_token (user_id, fcm_token)
);
```

## Step 4: Send Notifications from Backend

### Add Firebase Admin SDK to your backend:

**Maven (pom.xml):**

```xml
<dependency>
    <groupId>com.google.firebase</groupId>
    <artifactId>firebase-admin</artifactId>
    <version>9.2.0</version>
</dependency>
```

**Gradle:**

```gradle
implementation 'com.google.firebase:firebase-admin:9.2.0'
```

### Initialize Firebase Admin:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click **Generate new private key**
3. Save the JSON file to your backend resources folder
4. Initialize in your Spring Boot app:

```java
@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            FileInputStream serviceAccount = new FileInputStream(
                "src/main/resources/firebase-service-account.json"
            );

            FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

            FirebaseApp.initializeApp(options);

            System.out.println("✅ Firebase Admin SDK initialized");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### Send Notification Service:

```java
@Service
public class NotificationService {

    public void sendMessageNotification(
        String fcmToken,
        String senderName,
        String messageContent,
        Long chatRoomId
    ) {
        try {
            Message message = Message.builder()
                .setToken(fcmToken)
                .setNotification(Notification.builder()
                    .setTitle("New message from " + senderName)
                    .setBody(messageContent)
                    .build())
                .putData("chatRoomId", chatRoomId.toString())
                .putData("type", "chat_message")
                .setAndroidConfig(AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .build())
                .setWebpushConfig(WebpushConfig.builder()
                    .setNotification(WebpushNotification.builder()
                        .setIcon("/vite.svg")
                        .setBadge("/vite.svg")
                        .build())
                    .build())
                .build();

            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("✅ Notification sent: " + response);
        } catch (Exception e) {
            System.err.println("❌ Failed to send notification: " + e.getMessage());
        }
    }
}
```

### Integrate with your message sending:

```java
@Service
public class ChatService {

    @Autowired
    private NotificationService notificationService;

    public void sendMessage(ChatMessage message) {
        // Save message to database
        chatRepository.save(message);

        // Get receiver's FCM token
        String fcmToken = userService.getFcmToken(message.getReceiverId());

        if (fcmToken != null) {
            // Send push notification
            notificationService.sendMessageNotification(
                fcmToken,
                message.getSenderName(),
                message.getContent(),
                message.getChatRoomId()
            );
        }

        // Send via WebSocket
        messagingTemplate.convertAndSend(
            "/topic/chat/" + message.getChatRoomId(),
            message
        );
    }
}
```

## Step 5: Test Notifications

### Test from Firebase Console:

1. Go to Firebase Console → Cloud Messaging
2. Click **Send your first message**
3. Enter notification title and text
4. Click **Send test message**
5. Enter your FCM token (check browser console)
6. Click **Test**

### Test from Backend:

```java
// In your controller or test class
@GetMapping("/test-notification/{userId}")
public ResponseEntity<?> testNotification(@PathVariable Long userId) {
    String fcmToken = userService.getFcmToken(userId);

    if (fcmToken != null) {
        notificationService.sendMessageNotification(
            fcmToken,
            "Test User",
            "This is a test notification!",
            123L
        );
        return ResponseEntity.ok("Notification sent");
    }

    return ResponseEntity.badRequest().body("No FCM token found");
}
```

## Step 6: Handle Notification Clicks

The service worker already handles clicks and navigates to the chat:

```javascript
// In public/firebase-messaging-sw.js (already done)
self.addEventListener("notificationclick", (event) => {
  const chatRoomId = event.notification.data?.chatRoomId;
  const url = chatRoomId ? `/chat/${chatRoomId}` : "/chats";

  // Opens the chat or focuses existing window
  clients.openWindow(url);
});
```

## Step 7: Request Permission from User

The permission is automatically requested when the app loads. To manually request:

```javascript
import { useFirebaseNotifications } from "./hooks/useFirebaseNotifications";

function MyComponent() {
  const { isPermissionGranted, requestPermission } = useFirebaseNotifications();

  return (
    <div>
      {!isPermissionGranted && (
        <button onClick={requestPermission}>Enable Notifications</button>
      )}
    </div>
  );
}
```

## Troubleshooting

### Issue: Service Worker not registering

**Solution:**

- Check browser console for errors
- Ensure you're on HTTPS or localhost
- Clear browser cache and service workers (DevTools → Application → Service Workers)

### Issue: No FCM token generated

**Solution:**

- Verify VAPID key is correct
- Check notification permission is granted
- Check browser console for Firebase errors

### Issue: Notifications not showing

**Solution:**

- Verify FCM token is sent to backend
- Check backend logs for send errors
- Test with Firebase Console first
- Ensure notification permission is granted
- Check browser notification settings

### Issue: Service Worker 404 error

**Solution:**

- Ensure `firebase-messaging-sw.js` is in `public/` folder
- Check Vite config doesn't exclude it
- Verify file path in registration: `/firebase-messaging-sw.js`

## Security Notes

1. ⚠️ **Never commit** Firebase service account JSON to git
2. ⚠️ Use environment variables for sensitive keys in production
3. ⚠️ Validate FCM tokens on backend before saving
4. ⚠️ Implement rate limiting for notification sending
5. ⚠️ Allow users to opt-out and delete their FCM tokens

## Testing Checklist

- [ ] VAPID key added to all 3 files
- [ ] Service Worker registered successfully (check console)
- [ ] FCM token generated (check console)
- [ ] FCM token sent to backend (check network tab)
- [ ] Backend endpoint created and working
- [ ] Firebase Admin SDK initialized in backend
- [ ] Test notification from Firebase Console works
- [ ] Test notification from backend works
- [ ] Notification click opens correct chat
- [ ] Foreground notifications show toast
- [ ] Background notifications show system notification

## Next Steps

1. ✅ Complete Step 1-2 (Get and add VAPID key)
2. ✅ Create backend endpoint (Step 3)
3. ✅ Setup Firebase Admin SDK (Step 4)
4. ✅ Test notifications (Step 5)
5. ✅ Deploy and test in production

## Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Web Push Notifications](https://firebase.google.com/docs/cloud-messaging/js/client)
