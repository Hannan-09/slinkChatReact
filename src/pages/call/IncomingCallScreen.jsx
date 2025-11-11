import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IoClose, IoCall } from 'react-icons/io5';

export default function IncomingCallScreen() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const callerId = searchParams.get('callerId') || '';
    const callerName = searchParams.get('callerName') || 'Unknown';
    const callerAvatar = searchParams.get('callerAvatar') || '';
    const isVideoCall = searchParams.get('isVideoCall') === 'true';

    const [isNavigating, setIsNavigating] = useState(false);
    const [callStatus, setCallStatus] = useState('ringing');

    // Cleanup: Stop ringtone when component unmounts
    useEffect(() => {
        console.log('Incoming call screen mounted');

        // Play ringtone (you can add audio here)
        // const audio = new Audio('/ringtone.mp3');
        // audio.loop = true;
        // audio.play();

        return () => {
            console.log('Incoming call screen unmounting - FORCE STOP RINGTONE');
            // Stop ringtone
            // audio.pause();
            // audio.currentTime = 0;
        };
    }, []);

    // Navigate to active call when accepted, or back when ended
    useEffect(() => {
        if (isNavigating) return;

        if (callStatus === 'connecting' || callStatus === 'connected') {
            setIsNavigating(true);
            console.log('Call connecting/connected, navigating to active screen');
            navigate(
                `/call/active?callerId=${callerId}&callerName=${encodeURIComponent(
                    callerName
                )}&callerAvatar=${encodeURIComponent(
                    callerAvatar
                )}&isVideoCall=${isVideoCall}&isIncoming=true`
            );
        } else if (callStatus === 'ended') {
            setIsNavigating(true);
            console.log('Call ended, navigating back');
            navigate(-1);
        }
    }, [callStatus, isNavigating]);

    // Handle accept call
    const handleAccept = async () => {
        try {
            console.log('Accept button pressed');
            // Stop ringtone
            setCallStatus('connecting');
        } catch (error) {
            console.error('Error accepting call:', error);
            alert('Failed to accept call');
        }
    };

    // Handle reject call
    const handleReject = async () => {
        try {
            console.log('Reject button pressed');
            setIsNavigating(true);
            setCallStatus('ended');
            navigate(-1);
        } catch (error) {
            console.error('Error rejecting call:', error);
            navigate(-1);
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col justify-between py-12 px-6">
            {/* Caller Info */}
            <div className="flex-1 flex flex-col items-center justify-center">
                {/* Avatar with pulse animation */}
                <div className="mb-8 animate-pulse">
                    <div className="relative">
                        <img
                            src={decodeURIComponent(callerAvatar || '')}
                            alt={callerName}
                            className="w-36 h-36 md:w-40 md:h-40 rounded-full border-4 border-red-500 shadow-2xl"
                            style={{
                                boxShadow: '0 0 40px rgba(255, 71, 87, 0.8)',
                            }}
                            onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/150';
                            }}
                        />
                        {/* Pulse rings */}
                        <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75"></div>
                    </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
                    {callerName || 'Unknown'}
                </h1>
                <p className="text-lg text-gray-400 mb-2">
                    {isVideoCall ? 'Video Call' : 'Voice Call'}
                </p>
                <p className="text-base text-red-500 mt-3 animate-pulse">
                    Incoming call...
                </p>
            </div>

            {/* Call Actions */}
            <div className="flex items-center justify-around px-8 pb-8">
                {/* Reject Button */}
                <div className="flex flex-col items-center">
                    <button
                        onClick={handleReject}
                        className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-600 active:scale-95 transition-all"
                        style={{
                            boxShadow: '0 8px 16px rgba(255, 71, 87, 0.6)',
                        }}
                    >
                        <IoClose className="text-white text-5xl" />
                    </button>
                    <span className="text-white text-sm font-semibold mt-3">Decline</span>
                </div>

                {/* Accept Button */}
                <div className="flex flex-col items-center">
                    <button
                        onClick={handleAccept}
                        className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-green-600 active:scale-95 transition-all"
                        style={{
                            boxShadow: '0 8px 16px rgba(76, 175, 80, 0.6)',
                        }}
                    >
                        <IoCall className="text-white text-5xl" />
                    </button>
                    <span className="text-white text-sm font-semibold mt-3">Accept</span>
                </div>
            </div>
        </div>
    );
}
