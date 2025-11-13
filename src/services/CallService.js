// services/CallService.js
let ringtoneAudio = null;
let endToneAudio = null;
let currentCallData = null;

const CallService = {
  /**
   * Store current call globally
   */
  setCurrentCall(callData) {
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
    currentCallData = null;
  },

  /**
   * Play incoming call ringtone (loops until stopped)
   */
  playRingtone() {
    try {
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
          })
          .catch((err) => {
            console.warn("⚠️ Ringtone playback failed:", err);
            // Autoplay might be blocked by browser
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
        ringtoneAudio.pause();
        ringtoneAudio.currentTime = 0;
        ringtoneAudio = null;
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
      // Create audio element for end tone
      endToneAudio = new Audio("/sounds/call_end.mp3");
      endToneAudio.volume = 1.0;

      // Play end tone once
      const playPromise = endToneAudio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
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
