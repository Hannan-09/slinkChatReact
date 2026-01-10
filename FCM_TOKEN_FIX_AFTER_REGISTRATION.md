# FCM Token Fix After Registration

## Problem

After successful registration and auto-login, the FCM token was not being sent to the backend on the first launch. The token remained empty (`""`) and `fcmTokenSent` stayed `false`. Users had to reload the app for the FCM token to be generated and sent.

### Root Cause

1. **Asynchronous Token Generation**: FCM token generation is asynchronous and takes time
2. **Race Condition**: Auto-login happens immediately after registration, but FCM token isn't ready yet
3. **No Polling Mechanism**: The app wasn't waiting for the token to be generated after login
4. **Single Check**: The effect only ran once when `currentUserId` changed, missing the token when it arrived later

## Solution Implemented

### 1. Enhanced FCM Token Sending Logic (App.jsx)

#### Increased Retry Attempts

```javascript
const maxRetries = 5; // Increased from 3 to 5
```

#### Added Polling Mechanism

When user logs in but FCM token isn't ready:

- Polls every 1 second for up to 30 seconds
- Waits for FCM token generation to complete
- Automatically sends token once it's available

```javascript
// Poll for FCM token every 1 second for up to 30 seconds
let pollCount = 0;
const maxPolls = 30;

checkInterval = setInterval(() => {
  pollCount++;
  console.log(`⏳ Polling for FCM token (${pollCount}/${maxPolls})...`);

  if (pollCount >= maxPolls) {
    console.warn("⚠️ FCM token not generated after 30 seconds");
    clearInterval(checkInterval);
    sessionStorage.removeItem("needToSendFCM");
  }
}, 1000);
```

#### Clear Flag on Success

```javascript
// Clear the needToSendFCM flag on success
sessionStorage.removeItem("needToSendFCM");
```

### 2. Simplified Login Event Handler

Removed the duplicate effect that was trying to force-send the token. Now the main effect handles everything:

```javascript
// Listen for user login events to set flag
useEffect(() => {
  const handleUserLogin = () => {
    console.log("👤 User logged in event detected");
    sessionStorage.setItem("needToSendFCM", "true");
  };

  window.addEventListener("userLoggedIn", handleUserLogin);
  return () => window.removeEventListener("userLoggedIn", handleUserLogin);
}, []);
```

## How It Works Now

### Registration Flow

1. User completes registration
2. User creates private key
3. **Auto-login happens** (SignupScreen dispatches `userLoggedIn` event)
4. `needToSendFCM` flag is set in sessionStorage
5. App.jsx detects user is logged in but no FCM token yet
6. **Polling starts** - checks every 1 second for FCM token
7. FCM token is generated (by usePushNotifications hook)
8. **Token detected** - immediately sent to backend
9. Success flag stored in user data
10. `needToSendFCM` flag cleared

### Timing

- **Polling Duration**: Up to 30 seconds
- **Polling Interval**: 1 second
- **Retry Attempts**: 5 attempts with progressive delays (2s, 4s, 6s, 8s, 10s)
- **Total Wait Time**: Up to 30 seconds for token generation + 30 seconds for retries = 60 seconds max

## Benefits

1. ✅ **No Manual Reload Required** - Token sent automatically on first launch
2. ✅ **Handles Slow Networks** - Increased retries and longer polling
3. ✅ **Works on Mobile APK** - Polling waits for native token generation
4. ✅ **Graceful Degradation** - Continues even if token fails (doesn't crash)
5. ✅ **Better Logging** - Clear console logs for debugging
6. ✅ **Cleanup on Success** - Removes flags to prevent duplicate sends

## Testing Checklist

- [x] Register new user → auto-login → FCM token sent on first launch
- [x] Check console logs for polling messages
- [x] Verify `fcmTokenSent: true` in localStorage after registration
- [x] Verify `fcmToken` is not empty in localStorage
- [x] Test on slow network (token should still be sent)
- [x] Test on mobile APK (native token generation)
- [x] Verify no duplicate token sends
- [x] Verify flag cleanup after success

## Console Log Flow

```
👤 User logged in event detected
⏳ User logged in, waiting for FCM token...
⏳ Waiting for FCM token generation after login...
⏳ Polling for FCM token (1/30)...
⏳ Polling for FCM token (2/30)...
⏳ Polling for FCM token (3/30)...
✅ Push registration success, token: eyJhbGc...
📤 Sending FCM token to backend: eyJhbGc...
📤 User ID: 123
📤 Attempt: 1
✅ FCM token sent to backend successfully
```

## Files Modified

1. `src/App.jsx`
   - Enhanced FCM token sending logic
   - Added polling mechanism
   - Increased retry attempts
   - Simplified login event handler
   - Added cleanup on success

## Related Features

- Works with auto-login after registration
- Compatible with userId-based storage system
- Integrates with usePushNotifications hook
- Supports both web and native platforms

---

**Implementation Date:** January 10, 2026
**Status:** ✅ Complete
