import { IoCall, IoClose, IoVideocam } from 'react-icons/io5';
import { useCall } from '../contexts/CallContext';

export default function IncomingCallScreen() {
    const { callerInfo, isVideoCall, acceptCall, rejectCall } = useCall();

    if (!callerInfo) return null;

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black z-50 flex flex-col items-center justify-center p-6">
            {/* Caller Info */}
                <div className="flex flex-col items-center mb-12">
                <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_18px_32px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.16),inset_0_3px_5px_rgba(255,255,255,0.24),inset_0_-5px_10px_rgba(0,0,0,0.95),inset_4px_0_5px_rgba(255,255,255,0.16),inset_-4px_0_5px_rgba(0,0,0,0.8)] border border-black/70 flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-b from-[#181818] to-[#050505] shadow-[inset_0_3px_4px_rgba(255,255,255,0.5),inset_0_-4px_7px_rgba(0,0,0,0.98)] flex items-center justify-center">
                        <img
                            src={callerInfo.avatar || 'https://via.placeholder.com/150'}
                            alt={callerInfo.name}
                            className="w-24 h-24 rounded-full object-cover"
                        />
                    </div>
                </div>
                    <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping"></div>
                </div>

                <h2 className="text-white text-3xl font-bold mb-2">{callerInfo.name}</h2>
                <p className="text-gray-300 text-lg flex items-center gap-2">
                    {isVideoCall ? (
                        <>
                            <IoVideocam className="text-2xl" />
                            Incoming Video Call
                        </>
                    ) : (
                        <>
                            <IoCall className="text-2xl" />
                            Incoming Voice Call
                        </>
                    )}
                </p>
            </div>

            {/* Ringing Animation */}
            <div className="mb-12">
                <div className="flex gap-2">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="w-3 h-12 bg-green-500 rounded-full animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-8">
                {/* Reject Button - 3D nav-style button with dark inner and red icon (like nav) */}
                <button
                    onClick={rejectCall}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 group-hover:scale-110 transition-all">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            <IoClose className="text-[#ff3b30] text-4xl" />
                        </div>
                    </div>
                    <span className="text-white text-sm">Decline</span>
                </button>

                {/* Accept Button - 3D nav-style button with dark inner and green icon (like nav) */}
                <button
                    onClick={acceptCall}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 group-hover:scale-110 transition-all animate-bounce">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            {isVideoCall ? (
                                <IoVideocam className="text-[#34c759] text-4xl" />
                            ) : (
                                <IoCall className="text-[#34c759] text-4xl" />
                            )}
                        </div>
                    </div>
                    <span className="text-white text-sm">Accept</span>
                </button>
            </div>
        </div>
    );
}
