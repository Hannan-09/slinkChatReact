import { useEffect, useState, useCallback, useRef } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";

export default function useWebRTCCall() {
  const [callStatus, setCallStatus] = useState("idle");
  const [currentCall, setCurrentCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);

  const timerRef = useRef(null);

  const { connected, publish, subscribe, unsubscribe } = useWebSocket();

  /** ---------------------------------------------
   *  SOCKET CONNECTION SETUP
   * --------------------------------------------- */
  useEffect(() => {
    if (!connected) return;

    const setupSubscription = async () => {
      try {
        const { ApiUtils } = await import("../services/AuthService");
        const userId = await ApiUtils.getCurrentUserId();

        if (!userId) {
          console.warn("⚠️ No userId found, cannot subscribe.");
          return;
        }

        const destination = `/topic/call/${userId}`;
        console.log("📡 Subscribing to call signals:", destination);

        const subscription = await subscribe(destination, async (message) => {
          const { signalType, signalData } = message || {};
          console.log("📨 Call Signal Received:", signalType);

          switch (signalType) {
            case "call-request":
              await handleIncomingCall(signalData);
              break;
            case "call-accept":
              console.log("✅ Call accepted by receiver");
              setCallStatus("connecting");
              startTimer();
              break;
            case "call-reject":
              console.log("❌ Call rejected by receiver");
              endCallCleanup();
              break;
            case "call-end":
              console.log("📴 Call ended by other user");
              endCallCleanup();
              break;
            case "offer":
              await handleOffer(signalData);
              break;
            case "answer":
              await handleAnswer(signalData);
              break;
            case "ice-candidate":
              await handleIceCandidate(signalData);
              break;
            default:
              console.log("Unknown signal type:", signalType);
          }
        });

        return () => unsubscribe(destination);
      } catch (error) {
        console.error("Error setting up subscription:", error);
      }
    };

    setupSubscription();
  }, [connected, subscribe, unsubscribe]);

  /** ---------------------------------------------
   *  HELPER FUNCTIONS
   * --------------------------------------------- */
  const startTimer = () => {
    timerRef.current = setInterval(
      () => setCallDuration((prev) => prev + 1),
      1000
    );
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setCallDuration(0);
  };

  const endCallCleanup = () => {
    setCallStatus("ended");
    stopTimer();

    setTimeout(() => {
      setCallStatus("idle");
      setCurrentCall(null);
      setLocalStream(null);
      setRemoteStream(null);
    }, 700);
  };

  /** ---------------------------------------------
   *  SIGNAL HANDLERS (Offer, Answer, ICE)
   * --------------------------------------------- */
  const handleIncomingCall = async (callData) => {
    console.log("🔔 Incoming call detected:", callData);
    setCurrentCall(callData);
    setCallStatus("ringing");

    // Play ringtone (you can add audio here)
    // const audio = new Audio('/ringtone.mp3');
    // audio.loop = true;
    // audio.play();
  };

  const handleOffer = async (offerData) => {
    console.log("📨 Handling WebRTC Offer...");
    // WebRTC offer handling logic
    setCallStatus("connecting");
  };

  const handleAnswer = async (answerData) => {
    console.log("📨 Handling WebRTC Answer...");
    // WebRTC answer handling logic
    setCallStatus("connected");
    startTimer();
  };

  const handleIceCandidate = async (candidateData) => {
    console.log("📨 Handling ICE candidate...");
    // WebRTC ICE candidate handling logic
  };

  /** ---------------------------------------------
   *  CALL ACTIONS
   * --------------------------------------------- */
  const initiateOutgoingCall = useCallback(
    async (receiverId, receiverName, receiverAvatar, isVideoCall) => {
      try {
        console.log("📞 Initiating outgoing call to:", receiverId);

        const { ApiUtils } = await import("../services/AuthService");
        const callerId = await ApiUtils.getCurrentUserId();
        const callerName = localStorage.getItem("userName") || "You";

        if (!callerId) throw new Error("Could not fetch caller ID");

        setCallStatus("initiating");

        // Setup WebRTC (mock for now)
        // const local = await WebRTCService.initLocalStream(isVideoCall);
        // setLocalStream(local);

        const callId = `call-${Date.now()}`;
        const callData = {
          callId,
          callerId,
          callerName,
          receiverId,
          receiverName,
          receiverAvatar,
          isVideoCall,
        };

        setCurrentCall(callData);

        // Send call request via WebSocket
        const dest = `/app/call/${callerId}/${receiverId}/initiate`;
        publish(dest, callData);

        setCallStatus("ringing");
      } catch (error) {
        console.error("Error initiating outgoing call:", error);
        setCallStatus("error");
        alert(error.message || "Failed to initiate call");
      }
    },
    [publish]
  );

  const acceptIncomingCall = useCallback(async () => {
    try {
      console.log("✅ Accepting call...");

      const call = currentCall;
      if (!call) throw new Error("No call to accept");

      const { ApiUtils } = await import("../services/AuthService");
      const receiverId = await ApiUtils.getCurrentUserId();

      // Setup WebRTC (mock for now)
      // const local = await WebRTCService.initLocalStream(call.isVideoCall);
      // setLocalStream(local);

      // Send accept signal
      const dest = `/app/call/${call.callerId}/${receiverId}/accept`;
      publish(dest, { callId: call.callId });

      setCallStatus("connecting");
    } catch (err) {
      console.error("Error accepting call:", err);
      alert("Failed to accept call");
    }
  }, [currentCall, publish]);

  const rejectIncomingCall = useCallback(
    async (reason = "declined") => {
      try {
        console.log("❌ Rejecting call...");

        const call = currentCall;
        if (!call) return;

        const { ApiUtils } = await import("../services/AuthService");
        const receiverId = await ApiUtils.getCurrentUserId();

        // Send reject signal
        const dest = `/app/call/${call.callerId}/${receiverId}/reject`;
        publish(dest, {
          callId: call.callId,
          reason,
        });

        endCallCleanup();
      } catch (err) {
        console.error("Error rejecting call:", err);
      }
    },
    [currentCall, publish]
  );

  const endCurrentCall = useCallback(async () => {
    try {
      console.log("📴 Ending call...");

      const call = currentCall;
      if (!call) return endCallCleanup();

      const { ApiUtils } = await import("../services/AuthService");
      const currentUserId = await ApiUtils.getCurrentUserId();
      const otherUserId =
        call.callerId === currentUserId ? call.receiverId : call.callerId;

      // Send end signal
      const dest = `/app/call/${currentUserId}/${otherUserId}/end`;
      publish(dest, { callId: call.callId });

      endCallCleanup();
    } catch (err) {
      console.error("Error ending call:", err);
      endCallCleanup();
    }
  }, [currentCall, publish]);

  /** ---------------------------------------------
   *  TOGGLES
   * --------------------------------------------- */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    console.log("Mute toggled:", !isMuted);
    // WebRTC mute logic here
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
    console.log("Speaker toggled:", !isSpeakerOn);
    // WebRTC speaker logic here
  }, [isSpeakerOn]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return {
    currentCall,
    callStatus,
    localStream,
    remoteStream,
    callDuration,
    isMuted,
    isSpeakerOn,
    initiateCall: initiateOutgoingCall,
    acceptCall: acceptIncomingCall,
    rejectCall: rejectIncomingCall,
    endCall: endCurrentCall,
    toggleMute,
    toggleSpeaker,
    formatDuration,
  };
}
