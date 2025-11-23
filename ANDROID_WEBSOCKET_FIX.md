# 🔧 Android APK WebSocket Connection Fix

## 🐛 Problem:

WebSocket connections not working in Android APK build, but APIs work fine.

## ✅ Fixes Applied:

### 1. **Added ngrok Header to WebSocket Connection**

**File:** `src/hooks/useStompSocket.js`

```javascript
connectHeaders: {
  ...connectHeaders,
  'ngrok-skip-browser-warning': '1',  // ✅ Added
}
```

This bypasses ngrok's browser warning page that blocks WebSocket connections.

### 2. **Updated Capacitor Configuration**

**File:** `capacitor.config.json`

Added Android-specific settings:

```json
{
  "android": {
    "allowMixedContent": true, // Allow HTTP/HTTPS mixed content
    "captureInput": true, // Better input handling
    "webContentsDebuggingEnabled": true // Enable debugging
  }
}
```

Also added wildcard ngrok domains:

```json
"allowNavigation": [
  "*.ngrok-free.dev",
  "*.ngrok.io"
]
```

### 3. **Enhanced Error Logging**

Added detailed WebSocket error logging to help debug Android-specific issues.

## 🔍 Common Android WebSocket Issues:

### Issue 1: ngrok Warning Page

**Symptom:** WebSocket connects but immediately disconnects
**Solution:** ✅ Added `ngrok-skip-browser-warning` header

### Issue 2: Mixed Content

**Symptom:** WSS connection blocked when using HTTP
**Solution:** ✅ Added `allowMixedContent: true`

### Issue 3: Network Security

**Symptom:** Connection refused or timeout
**Solution:** ✅ Already configured in `network_security_config.xml`

### Issue 4: WebView Restrictions

**Symptom:** WebSocket not supported in WebView
**Solution:** ✅ Capacitor uses modern WebView with WebSocket support

## 🧪 Testing Steps:

### 1. **Rebuild the APK:**

```bash
# Build the web app
npm run build

# Sync with Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Build APK in Android Studio
```

### 2. **Enable USB Debugging:**

- Connect Android device via USB
- Enable Developer Options
- Enable USB Debugging

### 3. **Check Logs:**

```bash
# View Android logs
adb logcat | grep -i "websocket\|stomp\|socket"

# Or in Android Studio
View → Tool Windows → Logcat
Filter: "websocket"
```

### 4. **Test WebSocket Connection:**

- Open app on Android device
- Login to the app
- Check console logs for:
  - `✅ Connected to STOMP server`
  - Or error messages with details

## 🔧 Additional Debugging:

### Enable Chrome DevTools for Android:

1. Connect device via USB
2. Open Chrome on desktop
3. Go to `chrome://inspect`
4. Find your app and click "Inspect"
5. Check Console for WebSocket errors

### Check WebSocket URL:

Make sure `.env` has correct WebSocket URL:

```env
VITE_WEBSOCKET_URL=wss://endoplasmic-unpoetically-geraldo.ngrok-free.dev/ws
```

**Important:** Use `wss://` (not `ws://`) for secure connections!

### Verify Backend WebSocket Endpoint:

Test from browser first:

```javascript
// Open browser console and test
const ws = new WebSocket("wss://your-ngrok-url.ngrok-free.dev/ws");
ws.onopen = () => console.log("✅ Connected");
ws.onerror = (e) => console.error("❌ Error:", e);
```

## 🎯 Expected Behavior:

After these fixes, you should see in Android logs:

```
[STOMP INFO]: ✅ Connected to STOMP server
[STOMP INFO]: ✅ Subscribed to /topic/...
```

## ⚠️ Important Notes:

### 1. **ngrok Free Tier Limitations:**

- ngrok free URLs expire after 2 hours
- Need to update `.env` with new URL
- Consider ngrok paid plan or alternative tunneling

### 2. **Production Deployment:**

For production, use:

- Real domain with SSL certificate
- No ngrok/devtunnel
- Proper WebSocket server (wss://)

### 3. **Firewall/Network:**

Some networks block WebSocket connections:

- Corporate networks
- Public WiFi with restrictions
- Mobile data with carrier restrictions

## 🚀 Next Steps:

1. ✅ Rebuild APK with fixes
2. ✅ Test on Android device
3. ✅ Check logs for connection status
4. ✅ Verify messages send/receive

## 📱 Testing Checklist:

- [ ] APK builds successfully
- [ ] App opens without crashes
- [ ] Login works (API calls work)
- [ ] WebSocket connects (check logs)
- [ ] Can send messages
- [ ] Can receive messages
- [ ] Real-time updates work
- [ ] Notifications appear

## 🆘 If Still Not Working:

### Check These:

1. **WebSocket URL is correct** in `.env`
2. **Backend WebSocket is running** and accessible
3. **ngrok tunnel is active** (not expired)
4. **Android has internet permission** (already added)
5. **Network allows WebSocket** (try different network)

### Get Detailed Logs:

```bash
# Full Android logs
adb logcat > android_logs.txt

# Search for errors
grep -i "error\|exception\|websocket" android_logs.txt
```

### Test Backend Directly:

```bash
# Test WebSocket endpoint
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "ngrok-skip-browser-warning: 1" \
  https://your-ngrok-url.ngrok-free.dev/ws
```

---

**Summary:** The main issue was missing `ngrok-skip-browser-warning` header in WebSocket connection. This header is now added, along with proper Android Capacitor configuration for WebSocket support.
