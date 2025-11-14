import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWebSocket } from './WebSocketContext';
import webRTCCallService from '../services/WebRTCCallService';

// Import audio files
import ringtoneSound from '../assets/ringtone/iphone.mp3';
import callStartSound from '../assets/ringtone/call_start.mp3';
import callEndSound from '../assets/ringtone/call_end.mp3';

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
    const [callState, setCallState] = useState('idle');
    const pendingIceCandidates = useRef([]);
    const processedOfferRef = useRef(false);
    const processedAnswerRef = useRef(false);
    const processedAcceptRef = useRef(false);
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
    const callStartSoundRef = useRef(null);
    const callEndSoundRef = useRef(null);
    const callTimeoutRef = useRef(null);

    // Refs to store IDs immediately (state updates are async)
    const callerIdRef = useRef(null);
    const receiverIdRef = useRef(null);

    // Initialize sounds
    useEffect(() => {
        ringtoneRef.current = new Audio(ringtoneSound);
        ringtoneRef.current.loop = true;
        callStartSoundRef.current = new Audio(callStartSound);
        callEndSoundRef.current = new Audio(callEndSound);

        ringtoneRef.current.load();
        callStartSoundRef.current.load();
        callEndSoundRef.current.load();
    }, []);

    // Subscribe to call events
    useEffect(() => {
        if (!connected || !currentUserId) return;

        const callDestination = `/topic/call/${currentUserId}`;

        const handleCallEvent = async (message) => {
            const { signalType, signalData, callHistory } = message;

            switch (signalType) {
                case 'call-request':
                    if (signalData.callerId === currentUserId) {
                        // Caller receives confirmation with callHistoryId
                        const historyId = callHistory?.data?.callHistoryId;
                        setCallHistoryId(historyId);
                    } else {
                        // Receiver gets incoming call
                        handleIncomingCall(signalData, callHistory);
                    }
                    break;
                case 'call-accept':
                    if (callState === 'outgoing') {
                        handleCallAccepted();
                    }
                    break;
                case 'call-reject':
                    handleCallRejected();
                    break;
                case 'call-end':
                    handleCallEnded();
                    break;
                case 'call-busy':
                    handleCallBusy(signalData);
                    break;
                case 'call-not-answered':
                    handleCallNotAnsweredSignal();
                    break;
                case 'offer':
                    await handleOffer(message);
                    break;
                case 'answer':
                    await handleAnswer(message);
                    break;
                case 'ice-candidate':
                    await handleIceCandidate(message);
                    break;
                default:
                    break;
            }
        };

        const subscription = subscribe(callDestination, handleCallEvent);

        return () => {
            if (subscription) unsubscribe(callDestination);
        };
    }, [connected, currentUserId, callState]);

    // Sound functions
    const playRingtone = () => {
        if (ringtoneRef.current) {
            ringtoneRef.current.play().catch(err => {
                // Silently handle autoplay policy errors (expected for incoming calls)
                if (err.name !== 'NotAllowedError') {
                    console.error('Ringtone error:', err);
                }
            });
        }
    };

    const stopRingtone = () => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    };

    const playCallStartSound = () => {
        if (callStartSoundRef.current) {
            callStartSoundRef.current.currentTime = 0;
            callStartSoundRef.current.play().catch(err => {
                // Silently handle autoplay policy errors
                if (err.name !== 'NotAllowedError') {
                    console.error('Call start sound error:', err);
                }
            });
        }
    };

    const playCallEndSound = () => {
        if (callEndSoundRef.current) {
            callEndSoundRef.current.currentTime = 0;
            callEndSoundRef.current.play().catch(err => {
                // Silently handle autoplay policy errors
                if (err.name !== 'NotAllowedError') {
                    console.error('Call end sound error:', err);
                }
            });
        }
    };

    // Timer functions
    const startCallTimer = () => {
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const stopCallTimer = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }
    };

    const clearCallTimeout = () => {
        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current);
            callTimeoutRef.current = null;
        }
    };

    // Initiate call
    const initiateCall = async (receiver, isVideo = false) => {
        // Store IDs in refs immediately (state updates are async)
        callerIdRef.current = currentUserId;
        receiverIdRef.current = receiver.id;

        setCallState('outgoing');
        setIsVideoCall(isVideo);
        setCallerId(currentUserId);
        setReceiverId(receiver.id);
        setReceiverInfo(receiver);

        // Initialize WebRTC
        try {
            const { localStream: stream } = await webRTCCallService.initializePeerConnection(isVideo);
            setLocalStream(stream);

            webRTCCallService.setupEventHandlers(
                (candidate) => sendSignal('ice-candidate', { candidate }),
                (stream) => {
                    console.log('🎵 Caller: Remote stream received', stream);
                    setRemoteStream(stream);
                },
                (state) => {
                    console.log('🔗 Caller: Connection state:', state);
                    if (state === 'connected') startCallTimer();
                    else if (state === 'reconnecting') {
                        console.log('🔄 Caller: Reconnecting...');
                    }
                },
                async () => {
                    // Retry callback - recreate offer
                    console.log('🔄 Caller: Retrying connection...');
                    try {
                        const offer = await webRTCCallService.createOffer();
                        sendSignal('offer', { offer });
                    } catch (error) {
                        console.error('Error retrying offer:', error);
                    }
                }
            );
        } catch (error) {
            console.error('WebRTC init error:', error);
        }

        // Send to backend
        publish(`/app/call/${currentUserId}/${receiver.id}/initiate`, {
            callType: isVideo ? 'VIDEO' : 'AUDIO',
            signalData: {
                callerId: currentUserId,
                receiverId: receiver.id,
                isVideoCall: isVideo,
                callerName: 'You',
                callerAvatar: ''
            }
        });

        // Start 30-second timeout
        callTimeoutRef.current = setTimeout(() => {
            if (callState === 'outgoing' || callState === 'incoming') {
                handleCallNotAnswered();
            }
        }, 30000);
    };

    // Handle incoming call
    const handleIncomingCall = (signalData, callHistory) => {
        const historyId = callHistory?.data?.callHistoryId;

        // Store IDs in refs immediately (state updates are async)
        callerIdRef.current = signalData.callerId;
        receiverIdRef.current = currentUserId;

        setCallState('incoming');
        setIsVideoCall(signalData.isVideoCall);
        setCallerId(signalData.callerId);
        setReceiverId(currentUserId);
        setCallerInfo({
            id: signalData.callerId,
            name: signalData.callerName,
            avatar: signalData.callerAvatar
        });
        setCallHistoryId(historyId);
        playRingtone();

        // Start 30-second timeout for receiver too
        callTimeoutRef.current = setTimeout(() => {
            if (callState === 'incoming') {
                handleCallNotAnswered();
            }
        }, 30000);
    };

    // Accept call
    const acceptCall = async () => {
        stopRingtone();
        clearCallTimeout();

        setTimeout(() => playCallStartSound(), 200);

        // Get IDs from refs (guaranteed to be set immediately)
        const callerUserId = callerIdRef.current;
        const receiverUserId = receiverIdRef.current;

        // Initialize WebRTC FIRST before sending accept
        try {
            const { localStream: stream } = await webRTCCallService.initializePeerConnection(isVideoCall);
            setLocalStream(stream);

            webRTCCallService.setupEventHandlers(
                (candidate) => {
                    // Use ref values instead of state
                    const otherUserId = callerUserId;
                    if (!otherUserId || !receiverUserId) {
                        console.error('Cannot send ICE candidate - missing user IDs');
                        return;
                    }
                    publish(`/app/call/${receiverUserId}/${otherUserId}`, {
                        signalType: 'ice-candidate',
                        candidate
                    });
                },
                (stream) => {
                    console.log('🎵 Receiver: Remote stream received', stream);
                    setRemoteStream(stream);
                },
                (state) => {
                    console.log('🔗 Receiver: Connection state:', state);
                    if (state === 'connected') startCallTimer();
                    else if (state === 'reconnecting') {
                        console.log('🔄 Receiver: Reconnecting...');
                    }
                },
                async () => {
                    // Retry callback - wait for new offer from caller
                    console.log('🔄 Receiver: Waiting for retry from caller...');
                    // Receiver doesn't need to do anything, just wait for new offer
                }
            );

            // Now set state to active and send accept
            setCallState('active');

            // Send accept to backend
            publish(`/app/call/${callerUserId}/${receiverUserId}/accept`, {
                signalData: {},
                callHistoryId: callHistoryId
            });
        } catch (error) {
            console.error('WebRTC init error:', error);
            // If WebRTC fails, still accept the call
            setCallState('active');
            publish(`/app/call/${callerUserId}/${receiverUserId}/accept`, {
                signalData: {},
                callHistoryId: callHistoryId
            });
        }
    };

    // Reject call
    const rejectCall = () => {
        stopRingtone();
        clearCallTimeout();

        publish(`/app/call/${callerId}/${currentUserId}/reject`, {
            signalData: {},
            callHistoryId: callHistoryId
        });

        resetCallState();
    };

    // End call
    const endCall = () => {
        stopCallTimer();
        stopRingtone();
        clearCallTimeout();

        if (callState === 'active') {
            playCallEndSound();
        }

        if (callState !== 'idle' && callerId && receiverId && callHistoryId) {
            // Outgoing or active: use END endpoint
            if (callState === 'outgoing' || callState === 'active') {
                publish(`/app/call/${callerId}/${receiverId}/end`, {
                    signalData: {},
                    callHistoryId: callHistoryId,
                    endedById: currentUserId
                });
            }
            // Incoming: use REJECT endpoint
            else if (callState === 'incoming') {
                publish(`/app/call/${callerId}/${receiverId}/reject`, {
                    signalData: {},
                    callHistoryId: callHistoryId
                });
            }
        }

        webRTCCallService.closeConnection();
        setTimeout(() => resetCallState(), 500);
    };

    // Handle call not answered (timeout)
    const handleCallNotAnswered = () => {
        stopRingtone();
        clearCallTimeout();

        if ((callState === 'outgoing' || callState === 'incoming') && callerId && receiverId && callHistoryId) {
            publish(`/app/call/${callerId}/${receiverId}/notAnswered`, {
                signalData: {},
                callHistoryId: callHistoryId
            });
        }
    };

    // Handle call not answered signal from backend
    const handleCallNotAnsweredSignal = () => {
        stopRingtone();
        clearCallTimeout();
        webRTCCallService.closeConnection();
        alert('Call not answered');
        resetCallState();
    };

    // Handle call accepted
    const handleCallAccepted = async () => {
        // Prevent processing accept multiple times (from multiple subscriptions)
        if (processedAcceptRef.current) {
            console.log('Accept already processed, ignoring duplicate');
            return;
        }
        processedAcceptRef.current = true;

        clearCallTimeout();
        setCallState('active');

        setTimeout(() => playCallStartSound(), 200);

        // Create and send offer
        try {
            const offer = await webRTCCallService.createOffer();
            sendSignal('offer', { offer });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    };

    // Handle call rejected
    const handleCallRejected = () => {
        clearCallTimeout();
        alert('Call was rejected');
        resetCallState();
    };

    // Handle call ended
    const handleCallEnded = () => {
        clearCallTimeout();
        stopCallTimer();
        stopRingtone();

        if (callState === 'active') {
            playCallEndSound();
        }

        webRTCCallService.closeConnection();
        setTimeout(() => resetCallState(), callState === 'active' ? 500 : 0);
    };

    // Handle call busy
    const handleCallBusy = (signalData) => {
        clearCallTimeout();
        alert(signalData.message || 'User is on another call');
        resetCallState();
    };

    // Handle WebRTC offer
    const handleOffer = async (message) => {
        try {
            // Prevent processing the same offer multiple times (from multiple subscriptions)
            if (processedOfferRef.current) {
                console.log('Offer already processed, ignoring duplicate');
                return;
            }

            // The offer is in the message root, not in signalData
            const offer = message.offer;
            if (offer && webRTCCallService.peerConnection) {
                console.log('📥 Receiver: Processing offer');
                processedOfferRef.current = true;
                await webRTCCallService.setRemoteDescription(offer);
                console.log('✅ Receiver: Remote description set');
                const answer = await webRTCCallService.createAnswer();
                console.log('📤 Receiver: Sending answer');

                // Send answer directly - receiver sends to caller
                // Use refs instead of state (guaranteed to be set)
                const callerUserId = callerIdRef.current;
                const receiverUserId = receiverIdRef.current;

                if (callerUserId && receiverUserId) {
                    publish(`/app/call/${receiverUserId}/${callerUserId}`, {
                        signalType: 'answer',
                        answer
                    });
                } else {
                    console.error('Cannot send answer - missing user IDs:', { callerUserId, receiverUserId });
                }
            }
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    };

    // Handle WebRTC answer
    const handleAnswer = async (message) => {
        try {
            // Prevent processing the same answer multiple times
            if (processedAnswerRef.current) {
                console.log('Answer already processed, ignoring duplicate');
                return;
            }

            // The answer is in the message root, not in signalData
            const answer = message.answer;
            const peerConnection = webRTCCallService.peerConnection;

            if (answer && peerConnection) {
                // Only process answer if we're in the right state (have-local-offer)
                if (peerConnection.signalingState !== 'have-local-offer') {
                    console.log('Ignoring answer - wrong signaling state:', peerConnection.signalingState);
                    return;
                }

                console.log('📥 Caller: Processing answer');
                processedAnswerRef.current = true;
                await webRTCCallService.setRemoteDescription(answer);
                console.log('✅ Caller: Remote description set');

                // Process any pending ICE candidates
                console.log('🧊 Caller: Processing', pendingIceCandidates.current.length, 'pending ICE candidates');
                while (pendingIceCandidates.current.length > 0) {
                    const candidate = pendingIceCandidates.current.shift();
                    await webRTCCallService.addIceCandidate(candidate);
                }
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (message) => {
        try {
            // The candidate is in the message root, not in signalData
            const candidate = message.candidate;

            if (!candidate || !webRTCCallService.peerConnection) {
                console.log('🧊 Ignoring ICE candidate - no candidate or peer connection');
                return;
            }

            // If remote description is set, add candidate immediately
            if (webRTCCallService.peerConnection.remoteDescription) {
                console.log('🧊 Adding ICE candidate immediately');
                await webRTCCallService.addIceCandidate(candidate);
                console.log('✅ ICE candidate added');
            } else {
                // Queue it for later
                console.log('🧊 Queuing ICE candidate (no remote description yet)');
                pendingIceCandidates.current.push(candidate);
            }
        } catch (error) {
            console.error('❌ Error handling ICE candidate:', error);
        }
    };

    // Send WebRTC signal
    const sendSignal = (signalType, signalData) => {
        // Try to get IDs from refs first (more reliable), then fall back to state
        const callerUserId = callerIdRef.current || callerId;
        const receiverUserId = receiverIdRef.current || receiverId;
        const otherUserId = currentUserId === callerUserId ? receiverUserId : callerUserId;

        if (!otherUserId || !currentUserId) {
            console.error('Cannot send signal - missing user IDs:', {
                signalType,
                currentUserId,
                callerId: callerUserId,
                receiverId: receiverUserId,
                otherUserId
            });
            return;
        }

        publish(`/app/call/${currentUserId}/${otherUserId}`, {
            signalType,
            ...signalData
        });
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
        clearCallTimeout();
        stopCallTimer();
        stopRingtone();
        pendingIceCandidates.current = [];
        processedOfferRef.current = false;
        processedAnswerRef.current = false;
        processedAcceptRef.current = false;
        callerIdRef.current = null;
        receiverIdRef.current = null;
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
