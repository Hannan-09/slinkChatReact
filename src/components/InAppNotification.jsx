import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoClose, IoChatbubbleEllipses, IoPersonAdd, IoCheckmarkCircle, IoCallOutline } from 'react-icons/io5';

export default function InAppNotification({ notification, onClose }) {
    const navigate = useNavigate();
    const timerRef = useRef(null);

    useEffect(() => {
        // Auto-dismiss after 4 seconds (like toast)
        timerRef.current = setTimeout(() => {
            onClose();
        }, 4000);

        return () => {
            // Clear timer on unmount
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [onClose]);

    const handleClose = (e) => {
        if (e) {
            e.stopPropagation();
        }
        // Clear timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        // Close immediately
        onClose();
    };

    const handleClick = () => {
        // Close notification immediately
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        onClose();

        // Navigate immediately (no delay needed)
        if (notification.type === 'message' && notification.chatRoomId) {
            // Navigate to chat room with query parameters
            const senderName = notification.senderName || notification.title || 'User';
            const senderId = notification.senderId || '';
            const senderProfile = notification.senderProfile || '';

            navigate(`/chat/${notification.chatRoomId}?name=${encodeURIComponent(senderName)}&avatar=${encodeURIComponent(senderProfile)}&receiverId=${senderId}`);
        } else if (notification.type === 'chat_request' || notification.type === 'request_accepted') {
            navigate('/requests');
        } else if (notification.type === 'missed_call') {
            navigate('/call-history');
        } else if (notification.onClick) {
            notification.onClick();
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'message':
                return <IoChatbubbleEllipses className="text-blue-400 text-2xl" />;
            case 'chat_request':
                return <IoPersonAdd className="text-orange-400 text-2xl" />;
            case 'request_accepted':
                return <IoCheckmarkCircle className="text-green-400 text-2xl" />;
            case 'missed_call':
                return <IoCallOutline className="text-red-400 text-2xl" />;
            default:
                return <IoChatbubbleEllipses className="text-blue-400 text-2xl" />;
        }
    };

    return (
        <div
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-slideDown"
            style={{ width: 'calc(100% - 32px)', maxWidth: '500px' }}
        >
            <div
                onClick={handleClick}
                className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-xl cursor-pointer active:scale-95 transition-transform"
            >
                <div className="flex items-center p-4 gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] border border-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {notification.senderProfile ? (
                            <img
                                src={notification.senderProfile}
                                alt="Sender"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        ) : (
                            getIcon()
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="text-white font-semibold text-sm truncate">
                                {notification.title || 'Notification'}
                            </h4>
                            <button
                                onClick={handleClose}
                                className="text-gray-400 hover:text-white transition-colors ml-2 active:scale-90 transition-transform"
                            >
                                <IoClose className="text-xl" />
                            </button>
                        </div>
                        <p className="text-gray-300 text-sm line-clamp-2">
                            {notification.message}
                        </p>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-white/5 rounded-b-2xl overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{
                            animation: 'progress 4s linear forwards',
                        }}
                    />
                </div>
            </div>

            <style jsx>{`
                @keyframes slideDown {
                    from {
                        transform: translate(-50%, -100%);
                        opacity: 0;
                    }
                    to {
                        transform: translate(-50%, 0);
                        opacity: 1;
                    }
                }
                @keyframes progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
}