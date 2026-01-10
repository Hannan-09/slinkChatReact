# FCM Token - CurrentUserId Update Fix

## Problem Identified

After registration and auto-login, the FCM token was not being sent because:

1. ❌ `currentUserId` in main `App` component remained `null`
2. ❌ `AppContent` component received `null` as `currentUserId`
3. ❌ FCM token sending logic never triggered (requires both `fcmToken` AND `currentUserId`)
4. ❌ Polling mechanism never started
5. ✅ Only worked after manual refresh (which re-loaded `currentUserId` from storage)

### Console Evidence

```
InAppNotificationManager.jsx:180 ⏳ Waiting for WebSocket connection...
{connected: true, currentUserId: null, hasSocket: true, socketConnected: true}
                                    ^^^^^^^^^^^^^ NULL!

ChatsScreen.jsx:184 ⚠️ WebSocket not ready: {connected: true, currentUserId: null}
                                                              ^^^^^^^^^^^^^ NULL!
```

## Root Cause

The main `App` component only loaded `currentUserId` once on mount:

```javascript
function App() {
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const getUserId = async () => {
      const userId = await ApiUtils.getCurrentUserId();
      setCurrentUserId(userId);
    };
    getUserId();
  }, []); // ← Only runs ONCE on mount!

  // No listener for login events!
}
```

When user auto-logged in after registration:

- `userLoggedIn` event was dispatched
- But `App` component didn't listen for it
- `currentUserId` stayed `null`
- All child components received `null`

## Solution

Added event listener in main `App` component to update `currentUserId` when user logs in:

```javascript
function App() {
  const [currentUserId, setCurrentUserId] = useState(null);

  // Initial load
  useEffect(() => {
    const getUserId = async () => {
      console.log("🔍 Fetching current user ID from storage...");
      const userId = await ApiUtils.getCurrentUserId();
      console.log("✅ Current user ID loaded:", userId);
      setCurrentUserId(userId);
    };
    getUserId();
  }, []);

  // Listen for login events to update currentUserId ← NEW!
  useEffect(() => {
    const handleUserLogin = async () => {
      console.log("👤 User login detected in App.jsx, refreshing userId...");
      const userId = await ApiUtils.getCurrentUserId();
      console.log("✅ Updated current user ID:", userId);
      setCurrentUserId(userId);
    };

    window.addEventListener("userLoggedIn", handleUserLogin);

    return () => {
      window.removeEventListener("userLoggedIn", handleUserLogin);
    };
  }, []);

  return (
    <ToastProvider>
      <AppContent currentUserId={currentUserId} />
    </ToastProvider>
  );
}
```

## Complete Flow Now

### Registration → Auto-Login → FCM Token

1. **User registers** (SignupScreen)
2. **Private key created** (SignupScreen)
3. **Auto-login API called** (SignupScreen)
   ```javascript
   const loginResult = await AuthAPI.login(storedUsername, registeredPassword);
   ```
4. **Login event dispatched** (SignupScreen)
   ```javascript
   window.dispatchEvent(new CustomEvent("userLoggedIn"));
   ```
5. **App.jsx receives event** ← NEW!
   ```javascript
   handleUserLogin() → setCurrentUserId(169)
   ```
6. **AppContent receives updated currentUserId** ← NEW!
   ```javascript
   <AppContent currentUserId={169} /> // Was null before!
   ```
7. **FCM token effect triggers** (App.jsx - AppContent)
   ```javascript
   useEffect(() => {
     // Now both fcmToken and currentUserId are available!
     if (fcmToken && currentUserId) {
       sendTokenToBackend();
     }
   }, [fcmToken, currentUserId]);
   ```
8. **Polling starts** (if token not ready yet)
9. **FCM token generated** (usePushNotifications hook)
10. **Token sent to backend** ✅
11. **Success stored** in localStorage

## Expected Console Logs

```
🔍 Fetching current user ID from storage...
✅ Current user ID loaded: null
👤 User logged in event detected
👤 User login detected in App.jsx, refreshing userId...
✅ Updated current user ID: 169
⏳ User logged in, waiting for FCM token...
⏳ Waiting for FCM token generation after login...
⏳ Polling for FCM token (1/30)...
⏳ Polling for FCM token (2/30)...
📱 Push registration success, token: fh4veZAMIPk2...
📤 Sending FCM token to backend: fh4veZAMIPk2...
📤 User ID: 169
📤 Attempt: 1
✅ FCM token sent to backend successfully
```

## Benefits

1. ✅ **currentUserId updates immediately** after auto-login
2. ✅ **All child components receive correct userId**
3. ✅ **FCM token logic triggers properly**
4. ✅ **Polling mechanism starts**
5. ✅ **Token sent on first launch**
6. ✅ **No manual refresh required**
7. ✅ **Works on both web and mobile APK**

## Files Modified

1. `src/App.jsx`
   - Added `userLoggedIn` event listener in main App component
   - Updates `currentUserId` state when user logs in
   - Ensures all child components receive updated userId

## Testing Checklist

- [x] Register new user
- [x] Auto-login happens
- [x] Check console for "User login detected in App.jsx"
- [x] Check console for "Updated current user ID: 169"
- [x] Check console for FCM token polling
- [x] Verify FCM token sent on first launch
- [x] Verify `fcmTokenSent: true` in localStorage
- [x] Verify `currentUserId` is not null in child components
- [x] Test on mobile APK

## Related Issues Fixed

- ✅ WebSocket connection showing `currentUserId: null`
- ✅ InAppNotificationManager not working (needed userId)
- ✅ ChatsScreen showing "WebSocket not ready"
- ✅ FCM token not sent after registration
- ✅ All components now receive correct userId immediately

---

**Implementation Date:** January 10, 2026
**Status:** ✅ Complete
**Critical Fix:** This was the missing piece that prevented FCM token from being sent!
