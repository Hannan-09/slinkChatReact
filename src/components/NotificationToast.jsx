import { useEffect } from 'react';
import { IoClose, IoChatbubbleEllipses, IoPersonAdd, IoCheckmarkCircle, IoCallOutline } from 'react-icons/io5';

export default function NotificationToast({ notification, onClose, onClick, duration = 4000 }) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const handleClose = (e) => {
        e.stopPropagation();
        onClose();
    };

    const handleClick = () => {
        if (onClick) {
            onClick(notification);
        }
    };

    const getIcon = () => {
        switch (notification.type) {
            case 'message':
            case 'chat_message':
                return <IoChatbubbleEllipses className="text-blue-400 text-2xl" />;
            case 'chat_request':
                return <IoPersonAdd className="text-orange-400 text-2xl" />;
            case 'request_accepted':
                return <IoCheckmarkCircle className="text-green-400 text-2xl" />;
            case 'missed_call':
            case 'call':
            case 'incoming_call':
                return <IoCallOutline className="text-red-400 text-2xl" />;
            default:
                return <IoChatbubbleEllipses className="text-blue-400 text-2xl" />;
        }
    };

    return (
        <div
            onClick={handleClick}
            className="w-full max-w-md bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.9)] border border-white/10 backdrop-blur-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
        >
            <div className="flex items-center p-4 gap-3">
                {/* Avatar or Icon */}
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
                            className="text-gray-400 hover:text-white transition-colors ml-2 p-1 rounded-full hover:bg-white/10"
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
                        animation: `progress ${duration}ms linear forwards`,
                    }}
                />
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
            `}</style>
        </div>
    );
}
