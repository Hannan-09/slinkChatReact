// WebRTC Call Service - Handles peer-to-peer audio/video connections

class WebRTCCallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
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
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      onTrack(this.remoteStream);
    };

    // Connection state change
    this.peerConnection.onconnectionstatechange = () => {
      onConnectionStateChange(this.peerConnection.connectionState);
    };
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
  }
}

// Export singleton instance
const webRTCCallService = new WebRTCCallService();
export default webRTCCallService;
