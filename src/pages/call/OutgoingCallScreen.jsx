import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoCall } from 'react-icons/io5';

export default function OutgoingCallScreen() {
    const navigate = useNavigate();
    const toast = useToast();
    const [searchParams] = useSearchParams();

    const receiverId = searchParams.get('receiverId') || '';
    const receiverName = searchParams.get('receiverName') || 'Unknown';
    const receiverAvatar = searchParams.get('receiverAvatar') || '';
    const isVideoCall = searchParams.get('isVideoCall') === 'true';

    const [callStatus, setCallStatus] = useState('initiating');
    const [callInitiated, setCallInitiated] = useState(false);

    // Initiate call on mount
    useEffect(() => {
        if (!callInitiated && receiverId) {
            setCallInitiated(true);

            // Simulate call initiation
            (async () => {
                try {
                    // Simulate call states
                    setCallStatus('ringing');

                    // After 2 seconds, simulate connecting
                    setTimeout(() => {
                        setCallStatus('connecting');
                    }, 2000);
                } catch (error) {
                    console.error('Error initiating call:', error);
                    toast.error('Failed to initiate call. Please check your connection and try again.');
                    navigate(-1);
                }
            })();
        }
    }, [receiverId, callInitiated]);

    // Cleanup: Stop any ringtone when component unmounts
    useEffect(() => {
        return () => {
        };
    }, []);

    // Navigate to active call when connected
    useEffect(() => {
        if (callStatus === 'connecting' || callStatus === 'connected') {
            navigate(
                `/call/active?receiverId=${receiverId}&receiverName=${encodeURIComponent(
                    receiverName
                )}&receiverAvatar=${encodeURIComponent(
                    receiverAvatar
                )}&isVideoCall=${isVideoCall}&isIncoming=false`,
                { replace: true }
            );
        } else if (callStatus === 'ended') {
            navigate(-1);
        }
    }, [callStatus]);

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

    const getStatusText = () => {
        switch (callStatus) {
            case 'initiating':
                return 'Calling...';
            case 'ringing':
                return 'Ringing...';
            case 'connecting':
                return 'Connecting...';
            default:
                return 'Calling...';
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col justify-between py-12 px-6">
            {/* Receiver Info */}
            <div className="flex-1 flex flex-col items-center justify-center">
                {/* Avatar with pulse animation */}
                <div className="mb-8 animate-pulse">
                    <div className="relative">
                        <img
                            src={decodeURIComponent(receiverAvatar || '')}
                            alt={receiverName}
                            className="w-36 h-36 md:w-40 md:h-40 rounded-full border-4 border-green-500 shadow-2xl"
                            style={{
                                boxShadow: '0 0 40px rgba(76, 175, 80, 0.8)',
                            }}
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/150';
                            }}
                        />
                        {/* Pulse rings */}
                        <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-75"></div>
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
                    {receiverName || 'Unknown'}
                </h1>
                <p className="text-lg text-gray-400 mb-2">
                    {isVideoCall ? 'Video Call' : 'Voice Call'}
                </p>
                <p className="text-base text-green-500 mt-3 animate-pulse">
                    {getStatusText()}
                </p>
            </div>

            {/* Call Actions */}
            <div className="flex items-center justify-center px-8 pb-8">
                {/* End Call Button */}
                <div className="flex flex-col items-center">
                    <button
                        onClick={handleEndCall}
                        className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-600 active:scale-95 transition-all"
                        style={{
                            boxShadow: '0 8px 16px rgba(255, 71, 87, 0.6)',
                        }}
                    >
                        <IoCall
                            className="text-white text-5xl"
                            style={{ transform: 'rotate(135deg)' }}
                        />
                    </button>
                    <span className="text-white text-sm font-semibold mt-3">End Call</span>
                </div>
            </div>
        </div>
    );
}
