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
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };
  }

  // Get local media stream only (without creating peer connection)
  async getLocalStream(isVideoCall = false) {
    try {
      console.log("🎤 Requesting media permissions...", { isVideoCall });

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideoCall
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("✅ Media stream obtained:", {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
      });
      return this.localStream;
    } catch (error) {
      console.error(
        "❌ Error getting local stream:",
        error.name,
        error.message
      );
      throw error;
    }
  }

  // Initialize peer connection (can be called separately after getting local stream)
  async initializePeerConnection(isVideoCall = false) {
    try {
      // If local stream not already obtained, get it now
      if (!this.localStream) {
        await this.getLocalStream(isVideoCall);
      }

      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);

      // Add local tracks to peer connection
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Create remote stream
      this.remoteStream = new MediaStream();

      return { localStream: this.localStream, remoteStream: this.remoteStream };
    } catch (error) {
      console.error("Error initializing peer connection:", error);
      throw error;
    }
  }

  // Create peer connection with existing local stream (for receiver after accepting)
  async createPeerConnectionWithStream() {
    if (!this.localStream) {
      throw new Error(
        "Local stream must be set before creating peer connection"
      );
    }

    // Create peer connection
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Add local tracks to peer connection
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // Create remote stream
    this.remoteStream = new MediaStream();

    return { localStream: this.localStream, remoteStream: this.remoteStream };
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
  setupEventHandlers(
    onIceCandidate,
    onTrack,
    onConnectionStateChange,
    onRetry = null
  ) {
    if (!this.peerConnection) {
      console.warn(
        "Cannot setup event handlers - peer connection not initialized"
      );
      return;
    }

    // Store retry callback
    this.onRetryCallback = onRetry;

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
          if (this.onRetryCallback) {
            this.onRetryCallback();
          }
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

  // Switch / rotate camera (front ↔ back) on supported devices
  async switchCamera() {
    try {
      if (!this.localStream) {
        console.warn("switchCamera called without localStream");
        return;
      }

      const currentVideoTrack = this.localStream.getVideoTracks()[0];
      if (!currentVideoTrack) {
        console.warn("No video track to switch");
        return;
      }

      // Get list of video input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      if (videoDevices.length < 2) {
        console.warn("Not enough video devices to switch camera");
        return;
      }

      const currentSettings = currentVideoTrack.getSettings();
      const currentDeviceId = currentSettings.deviceId;

      // Pick the next device (different from current)
      const nextDevice =
        videoDevices.find((d) => d.deviceId !== currentDeviceId) ||
        videoDevices[0];

      console.log("🔄 Switching camera to device:", nextDevice.label);

      // Get new video stream from the selected device
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDevice.deviceId } },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        console.warn("Failed to get new video track when switching camera");
        return;
      }

      // Replace track in the peer connection (so remote sees new camera)
      if (this.peerConnection) {
        const videoSender = this.peerConnection
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Update localStream: stop old track, remove it, add new one
      currentVideoTrack.stop();
      this.localStream.removeTrack(currentVideoTrack);
      this.localStream.addTrack(newVideoTrack);
    } catch (err) {
      console.error("❌ Error switching camera:", err);
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
