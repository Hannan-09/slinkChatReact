import { IoCall, IoVideocam } from 'react-icons/io5';
import { useCall } from '../contexts/CallContext';

export default function OutgoingCallScreen() {
    const { receiverInfo, isVideoCall, endCall } = useCall();

    if (!receiverInfo) return null;

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black z-50 flex flex-col items-center justify-center p-6">
            {/* Receiver Info */}
                <div className="flex flex-col items-center mb-12">
                <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-b from-[#2e2e2e] via-[#151515] to-[#050505] shadow-[0_18px_32px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.18),inset_0_-3px_6px_rgba(0,0,0,0.9)] border border-white/25 flex items-center justify-center">
                        <img
                            src={receiverInfo.avatar || 'https://via.placeholder.com/150'}
                            alt={receiverInfo.name}
                            className="w-28 h-28 rounded-full object-cover"
                        />
                    </div>
                </div>

                <h2 className="text-white text-3xl font-bold mb-2">{receiverInfo.name}</h2>
                <p className="text-gray-300 text-lg flex items-center gap-2">
                    {isVideoCall ? (
                        <>
                            <IoVideocam className="text-2xl" />
                            Calling...
                        </>
                    ) : (
                        <>
                            <IoCall className="text-2xl" />
                            Calling...
                        </>
                    )}
                </p>
            </div>

            {/* Calling Animation */}
            <div className="mb-12">
                <div className="flex gap-2">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-16 bg-blue-500 rounded-full animate-pulse"
                            style={{
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: '1s'
                            }}
                        ></div>
                    ))}
                </div>
            </div>

            {/* End Call Button - 3D nav-style with dark inner and red icon */}
            <button
                onClick={endCall}
                className="flex flex-col items-center gap-2 group"
            >
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 group-hover:scale-110 transition-all rotate-135">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                        <IoCall className="text-[#ff3b30] text-4xl" />
                    </div>
                </div>
                <span className="text-white text-sm">End Call</span>
            </button>
        </div>
    );
}
