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
    const callStateRef = useRef('idle'); // Track call state immediately (not async like useState)
    const pendingIceCandidates = useRef([]);
    const processedOfferRef = useRef(false);
    const processedAnswerRef = useRef(false);
    const processedAcceptRef = useRef(false);
    const processedRejectRef = useRef(false);
    const processedBusyRef = useRef(false);
    const isProcessingOffer = useRef(false);
    const isProcessingAnswer = useRef(false);
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

    // UI messages
    const [busyMessage, setBusyMessage] = useState(null);

    // Refs
    const callTimerRef = useRef(null);
    const ringtoneRef = useRef(null);
    const callStartSoundRef = useRef(null);
    const callEndSoundRef = useRef(null);

    // Refs to store IDs immediately (state updates are async)
    const callerIdRef = useRef(null);
    const receiverIdRef = useRef(null);
    
    // Refs for audio/video elements
    const remoteAudioRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);

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
                    // Only the CALLER should process accept signal (when in 'outgoing' state)
                    if (callStateRef.current === 'outgoing') {
                        handleCallAccepted();
                    }
                    break;
                case 'call-reject':
                    // Only process reject if we're in a call state
                    if (callStateRef.current !== 'idle') {
                        handleCallRejected();
                    }
                    break;
                case 'call-end':
                    handleCallEnded();
                    break;
                case 'call-busy':
                    handleCallBusy(signalData);
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
        // Always clear any existing timer before starting a new one
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }

        // Reset duration at the start of each call
        setCallDuration(0);

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


    // Helper to update call state (both state and ref)
    const updateCallState = (newState) => {
        console.log('Updating call state from', callStateRef.current, 'to', newState);
        callStateRef.current = newState;
        setCallState(newState);
    };

    // Initiate call
    const initiateCall = async (receiver, isVideo = false) => {
        // Store IDs in refs immediately (state updates are async)
        callerIdRef.current = currentUserId;
        receiverIdRef.current = receiver.id;

        updateCallState('outgoing');
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
    };

    // Handle incoming call
    const handleIncomingCall = (signalData, callHistory) => {
        const historyId = callHistory?.data?.callHistoryId;

        // Store IDs in refs immediately (state updates are async)
        callerIdRef.current = signalData.callerId;
        receiverIdRef.current = currentUserId;

        updateCallState('incoming');
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
    };

    // Accept call
    const acceptCall = async () => {
        stopRingtone();

        setTimeout(() => playCallStartSound(), 200);

        // Get IDs from refs (guaranteed to be set immediately)
        const callerUserId = callerIdRef.current;
        const receiverUserId = receiverIdRef.current;

        // Set up local stream but DON'T create peer connection yet
        // Peer connection will be created when we receive the offer from caller
        try {
            const stream = await webRTCCallService.getLocalStream(isVideoCall);
            setLocalStream(stream);
        } catch (error) {
            console.error('Error getting local stream:', error);
            alert(`Please allow ${isVideoCall ? 'camera and microphone' : 'microphone'} access to make calls`);
            resetCallState();
            return;
        }

        // Update state to connected (but not active yet - will be active when offer is received)
        updateCallState('connected');

        // Send accept to backend
        publish(`/app/call/${callerUserId}/${receiverUserId}/accept`, {
            signalData: {},
            callHistoryId: callHistoryId
        });

        console.log('✅ Call accept sent, waiting for offer from caller...');
    };

    // Reject call
    const rejectCall = () => {
        stopRingtone();

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


    // Handle call accepted (caller receives this when receiver accepts)
    const handleCallAccepted = async () => {
        // Prevent processing accept multiple times (from multiple subscriptions)
        if (processedAcceptRef.current) {
            console.log('Accept already processed, ignoring duplicate');
            return;
        }
        processedAcceptRef.current = true;

        updateCallState('active');
        startCallTimer();

        setTimeout(() => playCallStartSound(), 200);

        // Only the CALLER should create an offer when they receive accept signal
        // The peer connection should already exist from initiateCall
        if (!webRTCCallService.peerConnection) {
            console.error('No peer connection exists when trying to create offer');
            return;
        }

        // Create and send offer
        try {
            console.log('📤 Caller: Creating offer after receiver accepted');
            const offer = await webRTCCallService.createOffer();
            sendSignal('offer', { offer });
            console.log('✅ Caller: Offer sent');
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    };

    // Handle call rejected
    const handleCallRejected = () => {
        // Prevent processing reject multiple times
        if (processedRejectRef.current) {
            console.log('Reject already processed, ignoring duplicate');
            return;
        }
        
        // Only show alert if we're actually in a call
        if (callStateRef.current !== 'idle') {
            processedRejectRef.current = true;
            // Remove alert - just reset state silently
            // alert('Call was rejected');
            resetCallState();
        }
    };

    // Handle call ended
    const handleCallEnded = () => {
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
        // Prevent processing busy multiple times for the same event burst
        if (processedBusyRef.current) {
            console.log('Busy already processed, ignoring duplicate');
            return;
        }

        processedBusyRef.current = true;

        const message =
            signalData?.message ||
            `${receiverInfo?.name || 'User'} is on another call. Please try again later.`;

        // Show UI popup via state instead of alert
        setBusyMessage(message);

        // Clean up any ongoing call UI/state
        resetCallState();
    };

    // Handle WebRTC offer (receiver receives this from caller)
    const handleOffer = async (message) => {
        try {
            // Prevent duplicate processing
            if (isProcessingOffer.current) {
                console.log('⚠️ Already processing an offer, ignoring duplicate');
                return;
            }

            // Prevent processing the same offer multiple times (from multiple subscriptions)
            if (processedOfferRef.current) {
                console.log('Offer already processed, ignoring duplicate');
                return;
            }

            // The offer is in the message root, not in signalData
            const offer = message.offer || message;
            
            if (!offer || !offer.type) {
                console.error('Invalid offer data:', message);
                return;
            }

            console.log('📥 Receiver: Processing offer from caller');

            // Check if we already have a remote description (duplicate offer)
            if (webRTCCallService.peerConnection && 
                webRTCCallService.peerConnection.signalingState !== 'stable') {
                console.log('Already processing offer, ignoring duplicate. State:', 
                    webRTCCallService.peerConnection.signalingState);
                return;
            }

            isProcessingOffer.current = true;
            processedOfferRef.current = true;

            // Create peer connection now (we have local stream from acceptCall)
            if (!webRTCCallService.peerConnection) {
                console.log('📡 Receiver: Creating peer connection with existing local stream');
                await webRTCCallService.createPeerConnectionWithStream();

                // Setup event handlers
                const callerUserId = callerIdRef.current;
                const receiverUserId = receiverIdRef.current;

                webRTCCallService.setupEventHandlers(
                    (candidate) => {
                        if (callerUserId && receiverUserId) {
                            publish(`/app/call/${receiverUserId}/${callerUserId}`, {
                                signalType: 'ice-candidate',
                                candidate
                            });
                        }
                    },
                    (stream) => {
                        console.log('🎵 Receiver: Remote stream received', stream);
                        setRemoteStream(stream);
                    },
                    (state) => {
                        console.log('🔗 Receiver: Connection state:', state);
                        if (state === 'connected') {
                            startCallTimer();
                            // State is already 'active', just ensure timer starts
                        } else if (state === 'reconnecting') {
                            console.log('🔄 Receiver: Reconnecting...');
                        }
                    },
                    null // No retry callback for receiver
                );

                // Set state to active immediately when peer connection is created
                // This ensures the ActiveCallScreen appears right away
                updateCallState('active');
                startCallTimer();
            }

            // Set remote description (the offer)
            await webRTCCallService.setRemoteDescription(offer);
            console.log('✅ Receiver: Remote description set');

            // Create and send answer
            const answer = await webRTCCallService.createAnswer();
            console.log('📤 Receiver: Sending answer');

            // Send answer - receiver sends to caller
            const callerUserId = callerIdRef.current;
            const receiverUserId = receiverIdRef.current;

            if (callerUserId && receiverUserId) {
                publish(`/app/call/${receiverUserId}/${callerUserId}`, {
                    signalType: 'answer',
                    answer
                });
                console.log('✅ Receiver: Answer sent');
            } else {
                console.error('Cannot send answer - missing user IDs:', { callerUserId, receiverUserId });
            }

            // Process any pending ICE candidates
            console.log('🧊 Receiver: Processing', pendingIceCandidates.current.length, 'pending ICE candidates');
            while (pendingIceCandidates.current.length > 0) {
                const candidate = pendingIceCandidates.current.shift();
                await webRTCCallService.addIceCandidate(candidate);
            }
        } catch (error) {
            console.error('Error handling offer:', error);
            processedOfferRef.current = false; // Allow retry on error
        } finally {
            isProcessingOffer.current = false;
        }
    };

    // Handle WebRTC answer
    const handleAnswer = async (message) => {
        try {
            // Prevent duplicate processing
            if (isProcessingAnswer.current) {
                console.log('⚠️ Already processing an answer, ignoring duplicate');
                return;
            }

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
                isProcessingAnswer.current = true;
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
        } finally {
            isProcessingAnswer.current = false;
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

    // Rotate / switch camera (front ↔ back)
    const rotateCamera = async () => {
        try {
            await webRTCCallService.switchCamera();
        } catch (err) {
            console.error('Error rotating camera:', err);
        }
    };

    // Reset call state
    const resetCallState = () => {
        stopCallTimer();
        stopRingtone();
        pendingIceCandidates.current = [];
        processedOfferRef.current = false;
        processedAnswerRef.current = false;
        processedAcceptRef.current = false;
        processedRejectRef.current = false;
        // Don't reset processedBusyRef here so duplicates are still blocked
        isProcessingOffer.current = false;
        isProcessingAnswer.current = false;
        callerIdRef.current = null;
        receiverIdRef.current = null;
        updateCallState('idle');
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

    // Update remote audio when remote stream changes
    useEffect(() => {
        if (remoteAudioRef.current && remoteStream) {
            console.log('🔊 Setting remote audio stream', remoteStream);
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(err => {
                console.error('Error playing remote audio:', err);
            });
        }
    }, [remoteStream]);

    // Update local video when local stream changes
    useEffect(() => {
        if (localVideoRef.current && localStream && isVideoCall) {
            console.log('📹 Setting local video stream', localStream);
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isVideoCall]);

    // Update remote video when remote stream changes
    useEffect(() => {
        if (remoteVideoRef.current && remoteStream && isVideoCall) {
            console.log('📹 Setting remote video stream', remoteStream);
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, isVideoCall]);

    const clearBusyMessage = () => {
        setBusyMessage(null);
        processedBusyRef.current = false;
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
        busyMessage,
        remoteAudio: remoteAudioRef,
        localVideoRef,
        remoteVideoRef,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        clearBusyMessage,
        rotateCamera,
    };

    return (
        <CallContext.Provider value={value}>
            {children}
            <audio ref={remoteAudioRef} autoPlay playsInline />
        </CallContext.Provider>
    );
};
