import { useEffect, useRef, useState } from 'react';
import { IoCall, IoMic, IoMicOff, IoVideocam, IoVideocamOff, IoVolumeHigh, IoVolumeMedium, IoSyncOutline } from 'react-icons/io5';
import { useCall } from '../contexts/CallContext';
import { Capacitor } from '@capacitor/core';

export default function ActiveCallScreen() {
    const {
        isVideoCall,
        isMuted,
        isVideoEnabled,
        callDuration,
        callerInfo,
        receiverInfo,
        localStream,
        remoteStream,
        endCall,
        toggleMute,
        toggleVideo,
        rotateCamera,
    } = useCall();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const localAudioRef = useRef(null);

    const [isSpeakerOn, setIsSpeakerOn] = useState(true); // Start with speaker ON for audio calls (will be set to earpiece after audio starts)
    const [audioInitialized, setAudioInitialized] = useState(false);
    const isNative = Capacitor.isNativePlatform();

    const otherUser = callerInfo || receiverInfo;

    // Build initials from other user name
    const buildInitials = (name) => {
        if (!name || name === 'Unknown') return 'U';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length === 0) return 'U';
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const otherUserInitials = otherUser ? buildInitials(otherUser.name) : 'U';

    // Check if avatar is valid
    const isValidAvatar = otherUser?.avatar &&
        otherUser.avatar.trim() !== '' &&
        otherUser.avatar !== 'null' &&
        otherUser.avatar !== 'undefined' &&
        (otherUser.avatar.startsWith('http://') || otherUser.avatar.startsWith('https://'));

    // Setup video streams
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Setup audio streams and default to earpiece on mobile
    useEffect(() => {
        if (remoteAudioRef.current && remoteStream && !audioInitialized) {
            console.log('🔊 Connecting remote audio stream', remoteStream);
            console.log('   Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind} (${t.id})`));
            remoteAudioRef.current.srcObject = remoteStream;
            // Audio should ALWAYS play at full volume
            remoteAudioRef.current.volume = 1.0;
            remoteAudioRef.current.play().then(() => {
                console.log('✅ Remote audio playing successfully');
                setAudioInitialized(true);

                // IMPORTANT: Set default audio output to EARPIECE on mobile (not speaker)
                if (isNative && !isVideoCall) {
                    console.log('📞 Audio call detected - routing to EARPIECE by default');
                    setIsSpeakerOn(false); // Set state to earpiece
                    setTimeout(() => {
                        setAudioOutputToEarpiece();
                    }, 500); // Small delay to ensure audio is playing
                } else if (isVideoCall) {
                    console.log('📹 Video call detected - keeping SPEAKER on');
                    setIsSpeakerOn(true);
                }
            }).catch(err => {
                console.error('❌ Error playing remote audio:', err);
            });
        }
    }, [remoteStream, isNative, audioInitialized, isVideoCall]);

    useEffect(() => {
        if (localAudioRef.current && localStream) {
            console.log('🎤 Connecting local audio stream');
            localAudioRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Set audio output to earpiece (default for calls)
    const setAudioOutputToEarpiece = () => {
        try {
            console.log('🔊 ========================================');
            console.log('🔊 Setting audio output to EARPIECE');
            console.log('🔊 ========================================');

            if (isNative) {
                // For Android - use native audio manager
                if (Capacitor.getPlatform() === 'android') {
                    console.log('📱 Android platform detected');
                    // Call native Android method to route audio to earpiece
                    if (window.AndroidAudioManager) {
                        console.log('✅ AndroidAudioManager found - calling setEarpiece()');
                        window.AndroidAudioManager.setEarpiece();
                        console.log('✅ setEarpiece() called successfully');
                    } else {
                        console.warn('⚠️ AndroidAudioManager not found!');
                        console.log('   Make sure MainActivity.java has the AudioManagerInterface');
                    }
                }

                // For Cordova/Capacitor plugins (iOS)
                if (window.cordova && window.cordova.plugins && window.cordova.plugins.iosrtc) {
                    console.log('📱 iOS platform detected - using iosrtc');
                    window.cordova.plugins.iosrtc.selectAudioOutput('earpiece');
                }
            } else if (remoteAudioRef.current && remoteAudioRef.current.setSinkId) {
                // For web browsers that support setSinkId
                console.log('🌐 Web platform - using setSinkId');
                remoteAudioRef.current.setSinkId('default').catch(err => {
                    console.warn('setSinkId not supported:', err);
                });
            }

            console.log('🔊 ========================================');
        } catch (error) {
            console.error('❌ Error setting earpiece:', error);
        }
    };

    // Set audio output to speaker
    const setAudioOutputToSpeaker = () => {
        try {
            console.log('🔊 ========================================');
            console.log('🔊 Setting audio output to SPEAKER');
            console.log('🔊 ========================================');

            if (isNative) {
                // For Android - use native audio manager
                if (Capacitor.getPlatform() === 'android') {
                    console.log('📱 Android platform detected');
                    // Call native Android method to route audio to speaker
                    if (window.AndroidAudioManager) {
                        console.log('✅ AndroidAudioManager found - calling setSpeaker()');
                        window.AndroidAudioManager.setSpeaker();
                        console.log('✅ setSpeaker() called successfully');
                    } else {
                        console.warn('⚠️ AndroidAudioManager not found!');
                        console.log('   Make sure MainActivity.java has the AudioManagerInterface');
                    }
                }

                // For Cordova/Capacitor plugins (iOS)
                if (window.cordova && window.cordova.plugins && window.cordova.plugins.iosrtc) {
                    console.log('📱 iOS platform detected - using iosrtc');
                    window.cordova.plugins.iosrtc.selectAudioOutput('speaker');
                }
            } else if (remoteAudioRef.current && remoteAudioRef.current.setSinkId) {
                // For web browsers that support setSinkId
                console.log('🌐 Web platform - using setSinkId');
                remoteAudioRef.current.setSinkId('communications').catch(err => {
                    console.warn('setSinkId not supported:', err);
                });
            }

            console.log('🔊 ========================================');
        } catch (error) {
            console.error('❌ Error setting speaker:', error);
        }
    };

    // Handle toggle speaker
    const handleToggleSpeaker = async () => {
        const newSpeakerState = !isSpeakerOn;
        setIsSpeakerOn(newSpeakerState);

        console.log('🔊 Speaker toggle:', newSpeakerState ? 'ON (speakerphone)' : 'OFF (earpiece)');

        // Ensure audio is always playing at full volume
        if (remoteAudioRef.current) {
            remoteAudioRef.current.volume = 1.0;
        }

        // Route audio to speaker or earpiece
        if (newSpeakerState) {
            setAudioOutputToSpeaker();
        } else {
            setAudioOutputToEarpiece();
        }
    };

    return (
        <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col safe-area-top">
            {/* Audio elements */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
            <audio ref={localAudioRef} muted className="hidden" />

            {/* Remote Video/Avatar */}
            <div className="flex-1 relative bg-[#1a1a1a] flex items-center justify-center">
                {isVideoCall && remoteStream ? (
                    <div className="w-full max-w-5xl aspect-video">
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1a1a]">
                        <div className="w-32 h-32 rounded-full bg-gradient-to-b from-[#2e2e2e] via-[#151515] to-[#050505] shadow-[0_18px_32px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.18),inset_0_-3px_6px_rgba(0,0,0,0.9)] border border-white/25 flex items-center justify-center mb-4 overflow-hidden">
                            {isValidAvatar ? (
                                <img
                                    src={otherUser.avatar}
                                    alt={otherUser.name}
                                    className="w-28 h-28 rounded-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            {/* Initials fallback */}
                            <div
                                className="w-28 h-28 rounded-full flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(to bottom, #3a3a3a, #2a2a2a)',
                                    display: !isValidAvatar ? 'flex' : 'none'
                                }}
                            >
                                <span className="text-white text-4xl font-bold" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                    {otherUserInitials}
                                </span>
                            </div>
                        </div>
                        <h2 className="text-white text-2xl font-bold">{otherUser?.name}</h2>
                    </div>
                )}

                {/* Call Info Overlay */}
                <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/50 to-transparent">
                    <div className="text-center">
                        <p className="text-white text-lg font-semibold">{otherUser?.name}</p>
                        <p className="text-gray-300 text-sm">{callDuration}</p>
                    </div>
                </div>

                {/* Local Video (Picture-in-Picture) */}
                {isVideoCall && localStream && (
                    <div className="absolute bottom-24 right-4 w-32 h-48 bg-gray-900 rounded-lg overflow-hidden shadow-2xl border-2 border-white">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        {!isVideoEnabled && (
                            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                                <IoVideocamOff className="text-white text-3xl" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="bg-gradient-to-t from-[#1a1a1a] to-transparent p-6">
                <div className="flex justify-center items-center gap-6">
                    {/* Mute Button - 3D nav-style */}
                    <button
                        onClick={toggleMute}
                        className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 transition-all"
                    >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            {isMuted ? (
                                <IoMicOff className="text-[#ff3b30] text-2xl" />
                            ) : (
                                <IoMic className="text-white text-2xl" />
                            )}
                        </div>
                    </button>

                    {/* Speaker Button - 3D nav-style */}
                    <button
                        onClick={handleToggleSpeaker}
                        className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 transition-all"
                    >
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            {isSpeakerOn ? (
                                <IoVolumeHigh className="text-[#34c759] text-2xl" />
                            ) : (
                                <IoVolumeMedium className="text-white text-2xl" />
                            )}
                        </div>
                    </button>

                    {/* End Call Button - 3D nav-style with dark inner and red icon */}
                    <button
                        onClick={endCall}
                        className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 transform hover:scale-110 transition-all rotate-135"
                    >
                        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            <IoCall className="text-[#ff3b30] text-3xl" />
                        </div>
                    </button>

                    {/* Video Toggle + Rotate - neumorphic */}
                    {isVideoCall && (
                        <>
                            <button
                                onClick={toggleVideo}
                                className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#4c4c4c] via-[#2a2a2a] to-[#111111] border border-[#f5f5f5]/30 shadow-[0_10px_18px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.85)] transition-all"
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#1d1d1d] via-[#111] to-[#050505] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-2px_3px_rgba(0,0,0,0.9)]">
                                    {isVideoEnabled ? (
                                        <IoVideocam className="text-white text-2xl" />
                                    ) : (
                                        <IoVideocamOff className="text-white text-2xl" />
                                    )}
                                </div>
                            </button>

                            {/* Rotate / Switch Camera Button */}
                            <button
                                onClick={rotateCamera}
                                className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#4c4c4c] via-[#2a2a2a] to-[#111111] border border-[#f5f5f5]/30 shadow-[0_10px_18px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.85)] transition-all"
                            >
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#1d1d1d] via-[#111] to-[#050505] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),inset_0_-2px_3px_rgba(0,0,0,0.9)]">
                                    <IoSyncOutline className="text-white text-2xl" />
                                </div>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
