import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationToast from '../components/NotificationToast';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();
    const recentNotificationsRef = useRef(new Map());

    const showNotification = useCallback((notificationData) => {
        // Create a unique key for deduplication
        const dedupeKey = `${notificationData.type}-${notificationData.chatRoomId}-${notificationData.senderId}-${notificationData.message?.substring(0, 50)}`;

        const now = Date.now();
        const lastShown = recentNotificationsRef.current.get(dedupeKey);

        // If same notification was shown in last 3 seconds, skip it
        if (lastShown && (now - lastShown) < 3000) {
            console.log('⚠️ BLOCKED duplicate notification:', dedupeKey, '| Time since last:', now - lastShown, 'ms');
            return;
        }

        // Store this notification timestamp
        recentNotificationsRef.current.set(dedupeKey, now);

        // Clean up old entries (older than 5 seconds)
        for (const [key, timestamp] of recentNotificationsRef.current.entries()) {
            if (now - timestamp > 5000) {
                recentNotificationsRef.current.delete(key);
            }
        }

        const id = Date.now() + Math.random();
        const notification = {
            id,
            ...notificationData,
            timestamp: new Date(),
        };

        console.log('✅ Showing notification:', notification);
        setNotifications((prev) => [...prev, notification]);
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const handleNotificationClick = useCallback((notification) => {
        console.log('🔔 Notification clicked:', notification);

        // Remove the notification
        removeNotification(notification.id);

        // Navigate based on notification type
        if (notification.type === 'message' || notification.type === 'chat_message') {
            if (notification.chatRoomId) {
                const senderName = notification.senderName || notification.title || 'User';
                const senderId = notification.senderId || '';
                const senderProfile = notification.senderProfile || '';

                navigate(`/chat/${notification.chatRoomId}?name=${encodeURIComponent(senderName)}&avatar=${encodeURIComponent(senderProfile)}&receiverId=${senderId}`);
            }
        } else if (notification.type === 'call' || notification.type === 'incoming_call') {
            navigate('/incoming-call', { state: { callData: notification } });
        } else if (notification.type === 'chat_request') {
            navigate('/requests');
        } else if (notification.type === 'request_accepted') {
            navigate('/chats');
        } else if (notification.onClick) {
            notification.onClick();
        }
    }, [navigate, removeNotification]);

    return (
        <NotificationContext.Provider value={{ showNotification, removeNotification }}>
            {children}
            <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
                <div className="flex flex-col items-center gap-2 p-4 pointer-events-auto">
                    {notifications.map((notification) => (
                        <NotificationToast
                            key={notification.id}
                            notification={notification}
                            onClose={() => removeNotification(notification.id)}
                            onClick={handleNotificationClick}
                            duration={4000}
                        />
                    ))}
                </div>
            </div>
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
}
