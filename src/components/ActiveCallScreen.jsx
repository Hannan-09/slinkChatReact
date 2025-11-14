import { useEffect, useRef, useState } from 'react';
import { IoCall, IoMic, IoMicOff, IoVideocam, IoVideocamOff, IoVolumeHigh, IoVolumeMedium } from 'react-icons/io5';
import { useCall } from '../contexts/CallContext';

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
    } = useCall();

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const localAudioRef = useRef(null);

    const [isSpeakerOn, setIsSpeakerOn] = useState(true);

    const otherUser = callerInfo || receiverInfo;

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

    // Setup audio streams
    useEffect(() => {
        if (remoteAudioRef.current && remoteStream) {
            console.log('🔊 Connecting remote audio stream', remoteStream);
            console.log('   Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind} (${t.id})`));
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.3;
            remoteAudioRef.current.play().then(() => {
                console.log('✅ Remote audio playing successfully');
            }).catch(err => {
                console.error('❌ Error playing remote audio:', err);
            });
        }
    }, [remoteStream, isSpeakerOn]);

    useEffect(() => {
        if (localAudioRef.current && localStream) {
            console.log('🎤 Connecting local audio stream');
            localAudioRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // Handle toggle speaker
    const handleToggleSpeaker = () => {
        const newSpeakerState = !isSpeakerOn;
        setIsSpeakerOn(newSpeakerState);

        if (remoteAudioRef.current) {
            remoteAudioRef.current.volume = newSpeakerState ? 1.0 : 0.3;
            console.log('🔊 Speaker', newSpeakerState ? 'ON (100%)' : 'OFF (30%)');
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Audio elements */}
            <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
            <audio ref={localAudioRef} muted className="hidden" />

            {/* Remote Video/Avatar */}
            <div className="flex-1 relative">
                {isVideoCall && remoteStream ? (
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black">
                        <img
                            src={otherUser?.avatar || 'https://via.placeholder.com/150'}
                            alt={otherUser?.name}
                            className="w-32 h-32 rounded-full border-4 border-white shadow-2xl mb-4"
                        />
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
            <div className="bg-gradient-to-t from-black to-transparent p-6">
                <div className="flex justify-center items-center gap-6">
                    {/* Mute Button */}
                    <button
                        onClick={toggleMute}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${isMuted ? 'bg-red-500' : 'bg-gray-700'
                            }`}
                    >
                        {isMuted ? (
                            <IoMicOff className="text-white text-2xl" />
                        ) : (
                            <IoMic className="text-white text-2xl" />
                        )}
                    </button>

                    {/* Speaker Button */}
                    <button
                        onClick={handleToggleSpeaker}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${isSpeakerOn ? 'bg-gray-700' : 'bg-red-500'
                            }`}
                    >
                        {isSpeakerOn ? (
                            <IoVolumeHigh className="text-white text-2xl" />
                        ) : (
                            <IoVolumeMedium className="text-white text-2xl" />
                        )}
                    </button>

                    {/* End Call Button */}
                    <button
                        onClick={endCall}
                        className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-600 transition-all transform hover:scale-110 rotate-135"
                    >
                        <IoCall className="text-white text-3xl" />
                    </button>

                    {/* Video Toggle Button */}
                    {isVideoCall && (
                        <button
                            onClick={toggleVideo}
                            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${!isVideoEnabled ? 'bg-red-500' : 'bg-gray-700'
                                }`}
                        >
                            {isVideoEnabled ? (
                                <IoVideocam className="text-white text-2xl" />
                            ) : (
                                <IoVideocamOff className="text-white text-2xl" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
