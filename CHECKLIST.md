# ✅ Firebase Notifications Checklist

## Frontend (All Done! ✅)

- [x] ✅ VAPID key added to `firebase.js`
- [x] ✅ VAPID key added to `src/hooks/useDeviceToken.js`
- [x] ✅ Service Worker registered in `src/main.jsx`
- [x] ✅ Firebase initialized in `src/main.jsx`
- [x] ✅ `useFirebaseNotifications` hook used in `App.jsx`
- [x] ✅ Auto-send FCM token to backend in `App.jsx`
- [x] ✅ `manifest.json` created for PWA support
- [x] ✅ `index.html` updated with manifest link

**Frontend Status: 100% Complete! 🎉**

---

## Backend (You Need to Do This! ⚠️)

### Step 1: Create API Endpoint

- [ ] Create `POST /api/v1/users/{userId}/fcm-token` endpoint
- [ ] Add request validation
- [ ] Add authentication check
- [ ] Test with Postman

### Step 2: Database Setup

- [ ] Add `fcm_token` column to users table
      OR
- [ ] Create `user_fcm_tokens` table (recommended)
- [ ] Test database insert

### Step 3: Firebase Admin SDK

- [ ] Add Firebase Admin dependency to `pom.xml`/`build.gradle`
- [ ] Download service account JSON from Firebase Console
- [ ] Save JSON to `src/main/resources/`
- [ ] Initialize Firebase Admin in Spring Boot
- [ ] Test initialization

### Step 4: Notification Service

- [ ] Create `NotificationService` class
- [ ] Add method to send notifications
- [ ] Integrate with message sending
- [ ] Test sending notification

### Step 5: End-to-End Testing

- [ ] Login to app
- [ ] Verify FCM token sent to backend (check network tab)
- [ ] Verify token saved in database
- [ ] Send test message
- [ ] Verify notification received
- [ ] Click notification
- [ ] Verify opens correct chat

**Backend Status: 0% Complete - Needs Your Work! ⚠️**

---

## Quick Commands

### Check Service Worker (Browser Console)

```
Look for: ✅ Service Worker registered
```

### Check FCM Token (Browser Console)

```
Look for: FCM Token: ...
```

### Test Backend Endpoint (Postman)

```
POST http://localhost:8008/api/v1/users/1/fcm-token
Headers:
  Authorization: Bearer {your-token}
  Content-Type: application/json
Body:
  {
    "fcmToken": "your-fcm-token-from-console"
  }
```

### Check Database

```sql
-- If using users table
SELECT id, username, fcm_token FROM users WHERE id = 1;

-- If using separate table
SELECT * FROM user_fcm_tokens WHERE user_id = 1;
```

---

## Estimated Time

- ✅ Frontend: **DONE** (0 hours)
- ⚠️ Backend: **1-2 hours** (your work)

---

## Need Help?

- **Quick Start:** See `FIREBASE_QUICK_START.md`
- **Detailed Guide:** See `FIREBASE_NOTIFICATION_SETUP.md`
- **Current Status:** See `FIREBASE_STATUS.md`
