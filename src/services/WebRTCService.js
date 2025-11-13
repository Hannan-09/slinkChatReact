// services/WebRTCService.js
import { RTCConfiguration } from "./webrtcConfig";

let pc = null;
let localStream = null;
let remoteStream = null;

const WebRTCService = {
  /**
   * Initialize local stream (mic and optionally camera)
   * @param {boolean} isVideoCall
   * @returns {MediaStream}
   */
  async initLocalStream(isVideoCall = false) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideoCall
          ? {
              facingMode: "user",
              frameRate: 30,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
      };

      localStream = await navigator.mediaDevices.getUserMedia(constraints);

      return localStream;
    } catch (err) {
      console.error("❌ Error getting local stream:", err);
      throw err;
    }
  },

  /**
   * Create peer connection
   * @param {Function} onRemoteTrack Callback for remote stream
   * @param {Function} onIceCandidate Callback for ICE candidates
   * @returns {RTCPeerConnection}
   */
  async createPeerConnection(onRemoteTrack, onIceCandidate) {
    if (pc) {
      console.warn(
        "⚠️ Existing PeerConnection found, closing it before creating a new one."
      );
      await this.close();
    }

    pc = new RTCPeerConnection(RTCConfiguration);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (onIceCandidate) onIceCandidate(event.candidate);
      }
    };

    // Handle remote track
    pc.ontrack = (event) => {
      remoteStream = event.streams && event.streams[0];
      if (onRemoteTrack && remoteStream) onRemoteTrack(remoteStream);
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        console.error("❌ Connection failed - attempting ICE restart");
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected") {
        console.warn("⚠️ ICE connection disconnected");
      } else if (pc.iceConnectionState === "failed") {
        console.error("❌ ICE connection failed");
      }
    };

    // Attach local tracks to peer connection
    if (localStream && localStream.getTracks) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    } else {
      console.warn("⚠️ No localStream available when creating PeerConnection");
    }

    return pc;
  },

  /** Create an SDP Offer */
  async createOffer() {
    if (!pc)
      throw new Error(
        "❌ Cannot create offer: PeerConnection not initialized."
      );

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  },

  /** Create an SDP Answer */
  async createAnswer() {
    if (!pc)
      throw new Error(
        "❌ Cannot create answer: PeerConnection not initialized."
      );

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  },

  /** Set remote description (offer/answer from peer) */
  async setRemoteDescription(desc) {
    if (!pc)
      throw new Error(
        "❌ Cannot set remote description: PeerConnection not initialized."
      );

    await pc.setRemoteDescription(desc);
  },

  /** Add an ICE candidate from peer */
  async addIceCandidate(candidate) {
    if (!pc) {
      console.warn("⚠️ Cannot add ICE candidate: no PeerConnection yet");
      return;
    }

    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      console.warn("⚠️ Error adding ICE candidate:", err);
    }
  },

  /** Toggle microphone mute */
  toggleMute() {
    if (!localStream) return false;

    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled;
    }
    return false;
  },

  /** Toggle speakerphone on/off */
  async setSpeakerPhone(enabled) {
    try {
      // Web doesn't have direct speakerphone control
      // Audio output is managed by the browser
    } catch (err) {
      console.warn("⚠️ Error setting speakerphone state:", err);
    }
  },

  /** Return local media stream */
  getLocalStream() {
    return localStream;
  },

  /** Return remote media stream */
  getRemoteStream() {
    return remoteStream;
  },

  /** Close the PeerConnection and cleanup */
  async close() {
    try {
      if (pc) {
        pc.close();
        pc = null;
      }

      if (localStream && localStream.getTracks) {
        localStream.getTracks().forEach((t) => t.stop());
      }

      localStream = null;
      remoteStream = null;
    } catch (err) {
      console.warn("⚠️ Error closing WebRTC connection:", err);
    }
  },
};

export default WebRTCService;
