# FCM Token Sending Fix

## Problem

FCM token was not being sent to backend on first login/registration because:

1. FCM token generation is asynchronous
2. Token might not be ready when user first logs in
3. The effect only runs when both `fcmToken` and `currentUserId` are available

## Solution Implemented

### 1. Enhanced Logging

Added detailed logging to track:

- When FCM token is available
- When user is logged in
- When token is being sent
- Retry attempts

### 2. Login Event Listener

Added listener for `userLoggedIn` event that:

- Sets a flag in sessionStorage when user logs in
- Triggers FCM token sending when token becomes available

### 3. Improved Token Sending Logic

- Checks if user is logged in but FCM token not ready yet
- Waits for FCM token to be generated
- Automatically sends when both are available
- Retries up to 3 times with progressive delays (2s, 4s, 6s)

### 4. Cleanup

- Properly cleans up retry timeouts on unmount
- Removes event listeners on unmount

## How It Works Now

### First Login Flow:

1. User registers/logs in
2. `userLoggedIn` event is triggered
3. Flag is set in sessionStorage: `needToSendFCM = true`
4. FCM token is generated (async, takes 1-3 seconds)
5. When FCM token is ready, the effect detects the flag
6. Resets `fcmTokenSent` to false to force sending
7. Main effect sends token to backend
8. Stores success in user data

### Subsequent Logins:

1. User logs in
2. FCM token is already available
3. Checks if token was already sent
4. Only sends if token changed or wasn't sent before

## Testing

### Check Console Logs:

```
⏳ User logged in, waiting for FCM token...
👤 User logged in event detected
✅ Push registration success, token: cC9Qg-v9b36TJ23XUulQXo...
🚀 FCM token needs to be sent to backend
📤 Sending FCM token to backend: cC9Qg-v9b36TJ23XUulQXo...
✅ FCM token sent to backend successfully
```

### Check localStorage:

```json
{
  "fcmToken": "cC9Qg-v9b36TJ23XUulQXo...",
  "fcmTokenSent": true,
  "lastFcmToken": "cC9Qg-v9b36TJ23XUulQXo..."
}
```

## Files Modified

- `src/App.jsx` - Enhanced FCM token sending logic with login event listener

## Benefits

✅ FCM token sent on first login
✅ Automatic retry on failure (3 attempts)
✅ Better logging for debugging
✅ Handles async token generation
✅ No page reload needed
✅ Works for both registration and login
