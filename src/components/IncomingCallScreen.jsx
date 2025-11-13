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
                    <img
                        src={callerInfo.avatar || 'https://via.placeholder.com/150'}
                        alt={callerInfo.name}
                        className="w-32 h-32 rounded-full border-4 border-white shadow-2xl animate-pulse"
                    />
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
                {/* Reject Button */}
                <button
                    onClick={rejectCall}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl group-hover:bg-red-600 transition-all transform group-hover:scale-110">
                        <IoClose className="text-white text-4xl" />
                    </div>
                    <span className="text-white text-sm">Decline</span>
                </button>

                {/* Accept Button */}
                <button
                    onClick={acceptCall}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-2xl group-hover:bg-green-600 transition-all transform group-hover:scale-110 animate-bounce">
                        {isVideoCall ? (
                            <IoVideocam className="text-white text-4xl" />
                        ) : (
                            <IoCall className="text-white text-4xl" />
                        )}
                    </div>
                    <span className="text-white text-sm">Accept</span>
                </button>
            </div>
        </div>
    );
}
