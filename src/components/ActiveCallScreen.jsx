import { useEffect, useRef } from 'react';
import { IoCall, IoMic, IoMicOff, IoVideocam, IoVideocamOff } from 'react-icons/io5';
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

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
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
