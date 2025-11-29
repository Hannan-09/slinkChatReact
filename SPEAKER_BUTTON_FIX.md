# Speaker Button Fix

## Problem

The speaker button was not working correctly:

- ❌ Audio was muted when speaker was OFF
- ❌ Audio only played when speaker was ON
- ❌ No way to hear the call through earpiece

## Root Cause

The implementation was controlling audio volume instead of audio routing:

```javascript
// OLD (WRONG):
remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.0;
// Speaker OFF = volume 0 (muted) ❌
// Speaker ON = volume 1 (speaker) ✅
```

## Solution Applied

### 1. Fixed Audio Volume

Audio now ALWAYS plays at full volume:

```javascript
// NEW (CORRECT):
remoteAudioRef.current.volume = 1.0; // Always play audio
```

### 2. Updated Speaker Toggle

The button now just toggles the state (visual indicator):

```javascript
const handleToggleSpeaker = async () => {
  const newSpeakerState = !isSpeakerOn;
  setIsSpeakerOn(newSpeakerState);
  // Audio always plays at full volume
  remoteAudioRef.current.volume = 1.0;
};
```

### 3. Behavior Now

- **Speaker OFF (default):** Audio plays through default output (earpiece on mobile, speakers on desktop)
- **Speaker ON (green):** Visual indicator that speaker mode is active

## Important Notes

### Web Browser Limitation

In web browsers, we **cannot** control earpiece vs speaker directly. The browser decides the audio output based on:

- Device type (phone, tablet, desktop)
- User's system audio settings
- Available audio outputs

### For Native Mobile App (Capacitor)

To properly control earpiece vs speaker in the mobile APK, you need to add native audio routing:

#### Option 1: Use Capacitor Plugin (Recommended)

Install a Capacitor audio plugin:

```bash
npm install @capacitor-community/audio-toggle
npx cap sync android
```

Then update the code:

```javascript
import { AudioToggle } from "@capacitor-community/audio-toggle";
import { Capacitor } from "@capacitor/core";

const handleToggleSpeaker = async () => {
  const newSpeakerState = !isSpeakerOn;
  setIsSpeakerOn(newSpeakerState);

  if (Capacitor.isNativePlatform()) {
    try {
      await AudioToggle.setSpeakerphoneOn({ value: newSpeakerState });
      console.log("🔊 Native speaker:", newSpeakerState ? "ON" : "OFF");
    } catch (error) {
      console.error("Error toggling speaker:", error);
    }
  }
};
```

#### Option 2: Use WebRTC setSinkId (Chrome/Edge only)

For browsers that support it:

```javascript
const handleToggleSpeaker = async () => {
  const newSpeakerState = !isSpeakerOn;
  setIsSpeakerOn(newSpeakerState);

  if (remoteAudioRef.current && "setSinkId" in remoteAudioRef.current) {
    try {
      // Get available audio devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === "audiooutput");

      if (audioOutputs.length > 0) {
        // Set to speaker or default
        const deviceId = newSpeakerState ? audioOutputs[0].deviceId : "default";
        await remoteAudioRef.current.setSinkId(deviceId);
      }
    } catch (error) {
      console.error("Error setting audio output:", error);
    }
  }
};
```

## Current Status

✅ **Fixed for Web:**

- Audio always plays
- Speaker button toggles visual state
- No more muted audio

⚠️ **For Mobile APK:**

- Audio plays through default output
- To control earpiece vs speaker, need to add native plugin (see above)

## Testing

### Web Browser:

1. Start a call
2. Audio should play immediately
3. Click speaker button → icon turns green
4. Click again → icon turns gray
5. Audio should play continuously regardless of button state

### Mobile APK (after adding native plugin):

1. Start a call
2. Audio plays through earpiece (default)
3. Click speaker button → audio switches to speaker
4. Click again → audio switches back to earpiece

## Recommendation

For the mobile APK, I recommend adding the native audio routing plugin to properly control earpiece vs speaker. The current fix ensures audio always plays, which is better than the previous behavior where it was muted.
