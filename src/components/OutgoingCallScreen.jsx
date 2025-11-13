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
                    <img
                        src={receiverInfo.avatar || 'https://via.placeholder.com/150'}
                        alt={receiverInfo.name}
                        className="w-32 h-32 rounded-full border-4 border-white shadow-2xl"
                    />
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

            {/* End Call Button */}
            <button
                onClick={endCall}
                className="flex flex-col items-center gap-2 group"
            >
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl group-hover:bg-red-600 transition-all transform group-hover:scale-110 rotate-135">
                    <IoCall className="text-white text-4xl" />
                </div>
                <span className="text-white text-sm">End Call</span>
            </button>
        </div>
    );
}
