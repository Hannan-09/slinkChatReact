import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebSocket } from './WebSocketContext';
import webRTCCallService from '../services/WebRTCCallService';

const CallContext = createContext();

export const useCall = () => {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within CallProvider');
    }
    return context;
};

export const CallProvider = ({ children, currentUserId }) => {
    const { subscribe, unsubscribe, publish, connected } = useWebSocket();

    // Call state
    const [callState, setCallState] = useState('idle'); // idle, outgoing, incoming, active, ended
    const [isVideoCall, setIsVideoCall] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [callDuration, setCallDuration] = useState(0);

    // Call participants
    const [callerId, setCallerId] = useState(null);
    const [receiverId, setReceiverId] = useState(null);
    const [callerInfo, setCallerInfo] = useState(null);
    const [receiverInfo, setReceiverInfo] = useState(null);

    // Media streams
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);

    // Call history ID
    const [callHistoryId, setCallHistoryId] = useState(null);

    // Refs
    const callTimerRef = useRef(null);
    const ringtoneRef = useRef(null);

    // Initialize ringtone
    useEffect(() => {
        ringtoneRef.current = new Audio('/ringtone.mp3');
        ringtoneRef.current.loop = true;
    }, []);

    // Subscribe to call events
    useEffect(() => {
        if (!connected || !currentUserId) return;

        const callDestination = `/topic/call/${currentUserId}`;

        const handleCallEvent = async (message) => {
            console.log('📞 Call event received:', message);
            const { signalType, signalData } = message;

            switch (signalType) {
                case 'call-request':
                    handleIncomingCall(signalData);
                    break;
                case 'call-accept':
                    handleCallAccepted(signalData);
                    break;
                case 'call-reject':
                    handleCallRejected(signalData);
                    break;
                case 'call-end':
                    handleCallEnded(signalData);
                    break;
                case 'call-busy':
                    handleCallBusy(signalData);
                    break;
                case 'offer':
                    handleOffer(signalData);
                    break;
                case 'answer':
                    handleAnswer(signalData);
                    break;
                case 'ice-candidate':
                    handleIceCandidate(signalData);
                    break;
                default:
                    console.log('Unknown signal type:', signalType);
            }
        };

        const subscription = subscribe(callDestination, handleCallEvent);

        return () => {
            if (subscription) unsubscribe(callDestination);
        };
    }, [connected, currentUserId]);

    // Start call timer
    const startCallTimer = () => {
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    // Stop call timer
    const stopCallTimer = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    };

    // Play ringtone
    const playRingtone = () => {
        if (ringtoneRef.current) {
            ringtoneRef.current.play().catch(err => console.error('Ringtone error:', err));
        }
    };

    // Stop ringtone
    const stopRingtone = () => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    };

    // Initiate call
    const initiateCall = async (receiver, isVideo = false) => {
        try {
            setCallState('outgoing');
            setIsVideoCall(isVideo);
            setCallerId(currentUserId);
            setReceiverId(receiver.id);
            setReceiverInfo(receiver);

            // Initialize WebRTC
            const { localStream: stream } = await webRTCCallService.initializePeerConnection(isVideo);
            setLocalStream(stream);

            // Setup WebRTC event handlers
            webRTCCallService.setupEventHandlers(
                (candidate) => sendSignal('ice-candidate', { candidate }),
                (stream) => setRemoteStream(stream),
                (state) => console.log('Connection state:', state)
            );

            // Send call initiate to backend
            const payload = {
                signalData: {
                    callerId: currentUserId,
                    receiverId: receiver.id,
                    isVideoCall: isVideo,
                    callerName: 'You',
                    callerAvatar: ''
                }
            };

            publish(`/app/call/${currentUserId}/${receiver.id}/initiate`, payload);
        } catch (error) {
            console.error('Error initiating call:', error);
            alert('Failed to start call. Please check camera/microphone permissions.');
            endCall();
        }
    };

    // Handle incoming call
    const handleIncomingCall = (signalData) => {
        console.log('📱 Incoming call:', signalData);
        setCallState('incoming');
        setIsVideoCall(signalData.isVideoCall);
        setCallerId(signalData.callerId);
        setReceiverId(currentUserId);
        setCallerInfo({
            id: signalData.callerId,
            name: signalData.callerName,
            avatar: signalData.callerAvatar
        });
        setCallHistoryId(signalData.callHistoryId);
        playRingtone();
    };

    // Accept call
    const acceptCall = async () => {
        try {
            stopRingtone();
            setCallState('active');

            // Initialize WebRTC
            const { localStream: stream } = await webRTCCallService.initializePeerConnection(isVideoCall);
            setLocalStream(stream);

            // Setup WebRTC event handlers
            webRTCCallService.setupEventHandlers(
                (candidate) => sendSignal('ice-candidate', { candidate }),
                (stream) => setRemoteStream(stream),
                (state) => {
                    console.log('Connection state:', state);
                    if (state === 'connected') {
                        startCallTimer();
                    }
                }
            );

            // Send accept to backend
            const payload = {
                signalData: {},
                callHistoryId: callHistoryId
            };

            publish(`/app/call/${callerId}/${currentUserId}/accept`, payload);

            // Create and send answer
            const answer = await webRTCCallService.createAnswer();
            sendSignal('answer', { answer });
        } catch (error) {
            console.error('Error accepting call:', error);
            rejectCall();
        }
    };

    // Reject call
    const rejectCall = () => {
        stopRingtone();

        const payload = {
            signalData: {},
            callHistoryId: callHistoryId
        };

        publish(`/app/call/${callerId}/${currentUserId}/reject`, payload);

        resetCallState();
    };

    // End call
    const endCall = () => {
        stopCallTimer();
        stopRingtone();

        if (callState !== 'idle') {
            const payload = {
                signalData: {},
                callHistoryId: callHistoryId,
                endedById: currentUserId
            };

            const otherUserId = currentUserId === callerId ? receiverId : callerId;
            publish(`/app/call/${callerId}/${receiverId}/end`, payload);
        }

        webRTCCallService.closeConnection();
        resetCallState();
    };

    // Handle call accepted
    const handleCallAccepted = async (signalData) => {
        console.log('✅ Call accepted');
        setCallState('active');

        // Create and send offer
        const offer = await webRTCCallService.createOffer();
        sendSignal('offer', { offer });
    };

    // Handle call rejected
    const handleCallRejected = (signalData) => {
        console.log('❌ Call rejected');
        alert('Call was rejected');
        resetCallState();
    };

    // Handle call ended
    const handleCallEnded = (signalData) => {
        console.log('📴 Call ended');
        stopCallTimer();
        webRTCCallService.closeConnection();
        resetCallState();
    };

    // Handle call busy
    const handleCallBusy = (signalData) => {
        console.log('📵 User is busy');
        alert(signalData.message || 'User is on another call');
        resetCallState();
    };

    // Handle WebRTC offer
    const handleOffer = async (signalData) => {
        await webRTCCallService.setRemoteDescription(signalData.offer);
    };

    // Handle WebRTC answer
    const handleAnswer = async (signalData) => {
        await webRTCCallService.setRemoteDescription(signalData.answer);
        startCallTimer();
    };

    // Handle ICE candidate
    const handleIceCandidate = async (signalData) => {
        await webRTCCallService.addIceCandidate(signalData.candidate);
    };

    // Send WebRTC signal
    const sendSignal = (signalType, signalData) => {
        const otherUserId = currentUserId === callerId ? receiverId : callerId;
        const payload = {
            signalType,
            ...signalData
        };
        publish(`/app/call/${currentUserId}/${otherUserId}`, payload);
    };

    // Toggle mute
    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        webRTCCallService.toggleAudio(!newMuted);
    };

    // Toggle video
    const toggleVideo = () => {
        const newEnabled = !isVideoEnabled;
        setIsVideoEnabled(newEnabled);
        webRTCCallService.toggleVideo(newEnabled);
    };

    // Reset call state
    const resetCallState = () => {
        setCallState('idle');
        setIsVideoCall(false);
        setIsMuted(false);
        setIsVideoEnabled(true);
        setCallDuration(0);
        setCallerId(null);
        setReceiverId(null);
        setCallerInfo(null);
        setReceiverInfo(null);
        setLocalStream(null);
        setRemoteStream(null);
        setCallHistoryId(null);
    };

    // Format call duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const value = {
        callState,
        isVideoCall,
        isMuted,
        isVideoEnabled,
        callDuration: formatDuration(callDuration),
        callerId,
        receiverId,
        callerInfo,
        receiverInfo,
        localStream,
        remoteStream,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
    };

    return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};
