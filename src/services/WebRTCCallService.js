// WebRTC Call Service - Handles peer-to-peer audio/video connections

class WebRTCCallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.retryCount = 0;
    this.maxRetries = 10;
    this.retryTimeout = null;
    this.onRetryCallback = null;
    this.configuration = {
      iceServers: [
        // STUN servers (for discovering public IP)
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        // TURN server (for relaying traffic when direct connection fails)
        {
          urls: "turn:openrelay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
        {
          urls: "turn:openrelay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject",
        },
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: "all", // Try all connection types
    };
  }

  // Initialize peer connection
  async initializePeerConnection(isVideoCall = false) {
    try {
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoCall ? { facingMode: "user" } : false,
      });

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Create remote stream
      this.remoteStream = new MediaStream();

      return { localStream: this.localStream, remoteStream: this.remoteStream };
    } catch (error) {
      console.error("Error initializing peer connection:", error);
      throw error;
    }
  }

  // Create offer (caller side)
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      return offer;
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  }

  // Create answer (receiver side)
  async createAnswer() {
    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      return answer;
    } catch (error) {
      console.error("Error creating answer:", error);
      throw error;
    }
  }

  // Set remote description
  async setRemoteDescription(description) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(description)
      );
    } catch (error) {
      console.error("Error setting remote description:", error);
      throw error;
    }
  }

  // Add ICE candidate
  async addIceCandidate(candidate) {
    try {
      if (candidate) {
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
  }

  // Setup event handlers
  setupEventHandlers(onIceCandidate, onTrack, onConnectionStateChange) {
    if (!this.peerConnection) return;

    // ICE candidate event
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate);
      }
    };

    // Track event (remote stream)
    this.peerConnection.ontrack = (event) => {
      console.log(
        "🎵 ontrack event received:",
        event.track.kind,
        event.streams[0]
      );
      event.streams[0].getTracks().forEach((track) => {
        console.log(
          "  Adding track:",
          track.kind,
          track.id,
          "enabled:",
          track.enabled
        );
        this.remoteStream.addTrack(track);
      });
      console.log(
        "🎵 Remote stream now has",
        this.remoteStream.getTracks().length,
        "tracks"
      );
      onTrack(this.remoteStream);
    };

    // ICE connection state change (more reliable for audio)
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection.iceConnectionState;
      console.log("🧊 ICE connection state changed:", iceState);

      // Clear any pending retry
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }

      // Treat ICE connected/completed as successful connection
      if (iceState === "connected" || iceState === "completed") {
        console.log("✅ ICE connection established - audio should work");
        this.retryCount = 0; // Reset retry count on success
        onConnectionStateChange("connected");
      } else if (iceState === "failed") {
        console.log("❌ ICE connection failed");
        this.handleConnectionFailure(onConnectionStateChange);
      } else if (iceState === "disconnected") {
        console.log("⚠️ ICE connection disconnected");
        // Wait a bit before considering it failed
        this.retryTimeout = setTimeout(() => {
          if (this.peerConnection?.iceConnectionState === "disconnected") {
            console.log("⚠️ ICE still disconnected, attempting retry...");
            this.handleConnectionFailure(onConnectionStateChange);
          }
        }, 3000);
        onConnectionStateChange("disconnected");
      } else if (iceState === "checking") {
        console.log("🔍 ICE connection checking...");
        onConnectionStateChange("connecting");
      }
    };

    // Connection state change (for logging only, ICE state is more reliable)
    this.peerConnection.onconnectionstatechange = () => {
      console.log(
        "🔗 Connection state changed:",
        this.peerConnection.connectionState
      );
      console.log(
        "   ICE connection state:",
        this.peerConnection.iceConnectionState
      );
      console.log("   Signaling state:", this.peerConnection.signalingState);

      // Only use connection state if ICE state is not connected/completed
      const iceState = this.peerConnection.iceConnectionState;
      if (iceState !== "connected" && iceState !== "completed") {
        // Only report connection state if ICE hasn't succeeded yet
        if (this.peerConnection.connectionState === "failed") {
          console.log("⚠️ Overall connection failed (but checking ICE state)");
        }
      }
    };
  }

  // Handle connection failure with retry
  handleConnectionFailure(onConnectionStateChange) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(
        `🔄 Attempting to reconnect (${this.retryCount}/${this.maxRetries})...`
      );
      onConnectionStateChange("reconnecting");

      // Trigger retry callback if provided
      if (this.onRetryCallback) {
        this.retryTimeout = setTimeout(() => {
          console.log("🔄 Executing retry...");
          this.onRetryCallback();
        }, 2000); // Wait 2 seconds before retry
      } else {
        onConnectionStateChange("failed");
      }
    } else {
      console.log("❌ Max retries reached, connection failed");
      this.retryCount = 0;
      onConnectionStateChange("failed");
    }
  }

  // Reset retry mechanism
  resetRetry() {
    this.retryCount = 0;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  // Toggle video
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  // Close connection
  closeConnection() {
    this.resetRetry();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.onRetryCallback = null;
  }
}

// Export singleton instance
const webRTCCallService = new WebRTCCallService();
export default webRTCCallService;
