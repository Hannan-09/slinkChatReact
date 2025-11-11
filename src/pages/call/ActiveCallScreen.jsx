import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    IoMic,
    IoMicOff,
    IoVolumeHigh,
    IoVolumeMedium,
    IoCall,
    IoVideocamOff,
} from 'react-icons/io5';

export default function ActiveCallScreen() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const receiverId = searchParams.get('receiverId') || '';
    const receiverName = searchParams.get('receiverName') || 'Unknown';
    const receiverAvatar = searchParams.get('receiverAvatar') || '';
    const callerId = searchParams.get('callerId') || '';
    const callerName = searchParams.get('callerName') || 'Unknown';
    const callerAvatar = searchParams.get('callerAvatar') || '';
    const isVideoCall = searchParams.get('isVideoCall') === 'true';
    const isIncoming = searchParams.get('isIncoming') === 'true';

    const [callStatus, setCallStatus] = useState('connecting');
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [showControls, setShowControls] = useState(true);

    const remoteAudioRef = useRef(null);
    const localAudioRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    // Get display name and avatar
    const displayName = isIncoming ? callerName : receiverName;
    const displayAvatar = isIncoming ? callerAvatar : receiverAvatar;

    // Simulate call connection
    useEffect(() => {
        setTimeout(() => {
            setCallStatus('connected');
        }, 1500);
    }, []);

    // Call duration timer
    useEffect(() => {
        if (callStatus === 'connected') {
            const interval = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [callStatus]);

    // Navigate back when call ends
    useEffect(() => {
        if (callStatus === 'ended') {
            navigate(-1);
        }
    }, [callStatus]);

    // Auto-hide controls after 5 seconds
    useEffect(() => {
        if (showControls) {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 5000);
        }
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [showControls]);

    // Format duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle end call
    const handleEndCall = async () => {
        try {
            setCallStatus('ended');
            navigate(-1);
        } catch (error) {
            console.error('Error ending call:', error);
            navigate(-1);
        }
    };

    // Handle toggle mute
    const handleToggleMute = () => {
        setIsMuted(!isMuted);
    };

    // Handle toggle speaker
    const handleToggleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
    };

    // Toggle controls visibility
    const handleScreenPress = () => {
        setShowControls(!showControls);
    };

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Audio elements */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
            <audio ref={localAudioRef} muted className="hidden" />

            {/* Video Container */}
            <div
                onClick={handleScreenPress}
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
            >
                {/* Remote Video/Avatar - Always show avatar for voice calls */}
                <div className="flex flex-col items-center justify-center bg-[#1a1a1a] w-full h-full">
                    <img
                        src={decodeURIComponent(displayAvatar || '')}
                        alt={displayName}
                        className="w-40 h-40 md:w-52 md:h-52 rounded-full border-4 border-green-500 mb-5 shadow-2xl"
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/200';
                        }}
                    />
                    <h2 className="text-3xl font-bold text-white">{displayName || 'Unknown'}</h2>
                </div>

                {/* Call Info Overlay */}
                {showControls && (
                    <div
                        className="absolute top-12 left-5 right-5 flex flex-col items-center transition-opacity duration-300"
                        style={{
                            textShadow: '0 1px 3px rgba(0, 0, 0, 0.75)',
                        }}
                    >
                        <p className="text-white text-base mb-1">
                            {callStatus === 'connected'
                                ? formatDuration(callDuration)
                                : 'Connecting...'}
                        </p>
                        <h3 className="text-white text-2xl font-bold">{displayName || 'Unknown'}</h3>
                    </div>
                )}

                {/* Call Controls */}
                {showControls && (
                    <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-5 px-8 transition-opacity duration-300">
                        {/* Mute Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMute();
                            }}
                            className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isMuted
                                    ? 'bg-red-500 bg-opacity-80'
                                    : 'bg-white bg-opacity-20 backdrop-blur-sm'
                                }`}
                        >
                            {isMuted ? (
                                <IoMicOff className="text-white text-3xl" />
                            ) : (
                                <IoMic className="text-white text-3xl" />
                            )}
                        </button>

                        {/* Speaker Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSpeaker();
                            }}
                            className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${isSpeakerOn
                                    ? 'bg-red-500 bg-opacity-80'
                                    : 'bg-white bg-opacity-20 backdrop-blur-sm'
                                }`}
                        >
                            {isSpeakerOn ? (
                                <IoVolumeHigh className="text-white text-3xl" />
                            ) : (
                                <IoVolumeMedium className="text-white text-3xl" />
                            )}
                        </button>

                        {/* End Call Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEndCall();
                            }}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500 flex items-center justify-center shadow-2xl hover:bg-red-600 active:scale-95 transition-all"
                            style={{
                                boxShadow: '0 8px 16px rgba(255, 71, 87, 0.6)',
                            }}
                        >
                            <IoCall
                                className="text-white text-4xl"
                                style={{ transform: 'rotate(135deg)' }}
                            />
                        </button>
                    </div>
                )}

                {/* WebRTC Not Available Message (for development) */}
                {isVideoCall && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#1a1a1a] bg-opacity-90 rounded-2xl p-6 max-w-sm mx-4 text-center">
                        <IoVideocamOff className="text-gray-400 text-6xl mx-auto mb-4" />
                        <h3 className="text-white text-lg mb-2">📹 Video Preview</h3>
                        <p className="text-gray-400 text-sm mb-3">
                            WebRTC requires a development build
                        </p>
                        <p className="text-gray-500 text-xs">
                            Run: npx expo prebuild
                            <br />
                            npx expo run:android
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
