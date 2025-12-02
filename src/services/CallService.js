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

      // Create audio element for ringtone with error handling
      ringtoneAudio = new Audio();
      ringtoneAudio.loop = true;
      ringtoneAudio.volume = 1.0;
      ringtoneAudio.preload = "auto";

      // Add error event listener before setting src
      ringtoneAudio.addEventListener("error", (e) => {
        console.warn("Ringtone audio error:", e);
      });

      // Set source and load
      try {
        ringtoneAudio.src = "/sounds/iphone.mp3";
        ringtoneAudio.load();
      } catch (srcError) {
        console.warn("Failed to load ringtone source:", srcError);
        return;
      }

      // Play ringtone
      const playPromise = ringtoneAudio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Ringtone playing");
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
      // Create audio element for end tone with error handling
      endToneAudio = new Audio();
      endToneAudio.volume = 1.0;
      endToneAudio.preload = "auto";

      // Add error event listener before setting src
      endToneAudio.addEventListener("error", (e) => {
        console.warn("End tone audio error:", e);
      });

      // Set source and load
      try {
        endToneAudio.src = "/sounds/call_end.mp3";
        endToneAudio.load();
      } catch (srcError) {
        console.warn("Failed to load end tone source:", srcError);
        return;
      }

      // Play end tone once
      const playPromise = endToneAudio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {})
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
