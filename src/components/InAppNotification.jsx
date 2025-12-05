import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoClose, IoChatbubbleEllipses, IoPersonAdd, IoCheckmarkCircle, IoCallOutline } from 'react-icons/io5';

export default function InAppNotification({ notification, onClose }) {
    const navigate = useNavigate();
    const timerRef = useRef(null);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Auto-dismiss after 4 seconds (like toast)
        timerRef.current = setTimeout(() => {
            handleClose();
        }, 4000);

        return () => {
            // Clear timer on unmount
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const handleClose = (e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        // Clear timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Start exit animation
        setIsExiting(true);

        // Remove after animation completes
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleClick = () => {
        // Clear timer
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Start exit animation
        setIsExiting(true);

        // Navigate after animation
        setTimeout(() => {
            onClose();

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
        }, 300);
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
            className={`fixed top-4 left-1/2 z-[9999] transition-all duration-300 ease-out ${isExiting
                ? 'opacity-0 -translate-y-full -translate-x-1/2'
                : 'opacity-100 translate-y-0 -translate-x-1/2'
                }`}
            style={{
                width: 'calc(100% - 32px)',
                maxWidth: '500px',
                animation: isExiting ? 'none' : 'slideDown 0.3s ease-out forwards'
            }}
        >
            <div
                onClick={handleClick}
                className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
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
                                className="text-gray-400 hover:text-white transition-colors ml-2 active:scale-90 transition-transform p-1 rounded-full hover:bg-white/10"
                                aria-label="Close notification"
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