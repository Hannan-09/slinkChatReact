import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoClose, IoChatbubbleEllipses, IoPersonAdd, IoCheckmarkCircle, IoCallOutline } from 'react-icons/io5';

export default function InAppNotification({ notification, onClose }) {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Slide in animation
        setTimeout(() => setIsVisible(true), 10);

        // Auto-dismiss after 5 seconds
        const timer = setTimeout(() => {
            handleClose();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleClick = () => {
        if (notification.onClick) {
            notification.onClick();
        } else if (notification.chatRoomId && notification.type === 'message') {
            const params = new URLSearchParams({
                name: notification.senderName || 'User',
                avatar: notification.senderProfile || '',
                receiverId: notification.receiverId || notification.senderId || '',
            });
            navigate(`/chat/${notification.chatRoomId}?${params.toString()}`);
        } else if (notification.chatRoomId) {
            navigate(`/chat/${notification.chatRoomId}`);
        } else if (notification.type === 'chat_request') {
            navigate('/requests');
        }
        handleClose();
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
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] transition-all duration-300 ${isVisible && !isExiting
                ? 'translate-y-0 opacity-100'
                : '-translate-y-full opacity-0'
                }`}
            style={{ width: 'calc(100% - 32px)', maxWidth: '500px' }}
        >
            <div
                onClick={handleClick}
                className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-xl cursor-pointer hover:scale-[1.02] transition-transform"
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleClose();
                                }}
                                className="text-gray-400 hover:text-white transition-colors ml-2"
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
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-progress"
                        style={{
                            animation: 'progress 5s linear forwards',
                        }}
                    />
                </div>
            </div>

            <style jsx>{`
                @keyframes progress {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }
                .animate-progress {
                    animation: progress 5s linear forwards;
                }
            `}</style>
        </div>
    );
}
