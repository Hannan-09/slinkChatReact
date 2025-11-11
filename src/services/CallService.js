// services/CallService.js
let ringtoneAudio = null;
let endToneAudio = null;
let currentCallData = null;

const CallService = {
  /**
   * Store current call globally
   */
  setCurrentCall(callData) {
    console.log("📞 Storing call data:", callData);
    currentCallData = callData;
  },

  /**
   * Retrieve current call data
   */
  getCurrentCall() {
    return currentCallData;
  },

  /**
   * Clear stored call data
   */
  clearCurrentCall() {
    console.log("🧹 Clearing call data");
    currentCallData = null;
  },

  /**
   * Play incoming call ringtone (loops until stopped)
   */
  playRingtone() {
    try {
      console.log("🔔 Playing ringtone...");

      // Stop existing ringtone if already playing
      this.stopRingtone();

      // Create audio element for ringtone
      ringtoneAudio = new Audio("/sounds/iphone.mp3");
      ringtoneAudio.loop = true;
      ringtoneAudio.volume = 1.0;

      // Play ringtone
      const playPromise = ringtoneAudio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("✅ Ringtone started");
          })
          .catch((err) => {
            console.warn("⚠️ Ringtone playback failed:", err);
            // Autoplay might be blocked by browser
            console.log(
              "Note: Browser may block autoplay. User interaction required."
            );
          });
      }
    } catch (e) {
      console.error("Error playing ringtone:", e);
    }
  },

  /**
   * Stop ringtone playback and release resources
   */
  stopRingtone() {
    try {
      if (ringtoneAudio) {
        console.log("🛑 Stopping ringtone...");
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        ringtoneAudio = null;
        console.log("🧹 Ringtone stopped and released");
      }
    } catch (e) {
      console.error("Error stopping ringtone:", e);
      ringtoneAudio = null;
    }
  },

  /**
   * Play short end-call tone (single play)
   */
  playEndTone() {
    try {
      console.log("🔚 Playing call end tone...");

      // Create audio element for end tone
      endToneAudio = new Audio("/sounds/call_end.mp3");
      endToneAudio.volume = 1.0;

      // Play end tone once
      const playPromise = endToneAudio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("✅ End tone played");
          })
          .catch((err) => {
            console.warn("⚠️ End tone failed:", err);
          });
      }

      // Release after playback
      endToneAudio.addEventListener("ended", () => {
        endToneAudio = null;
      });
    } catch (e) {
      console.error("Error playing end tone:", e);
    }
  },
};

export default CallService;
