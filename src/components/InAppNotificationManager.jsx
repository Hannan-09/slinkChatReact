import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import InAppNotification from './InAppNotification';
import EncryptionService from '../services/EncryptionService';
import { decryptEnvelope } from '../scripts/decryptEnvelope';
import { decryptMessage } from '../scripts/decryptMessage';

export default function InAppNotificationManager({ currentUserId }) {
    const [notifications, setNotifications] = useState([]);
    const location = useLocation();
    const { socket, connected } = useWebSocket();

    // Get current chat room ID from URL
    const getCurrentChatRoomId = useCallback(() => {
        const match = location.pathname.match(/^\/chat\/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }, [location.pathname]);

    // Handle incoming notifications from backend (LiveMessage format)
    const handleNotification = useCallback(async (payload, rawMessage) => {
        console.log('📬 In-app notification received:', payload);
        console.log('📬 Raw message:', rawMessage);
        console.log('📬 Payload type:', typeof payload);
        console.log('📬 Payload keys:', Object.keys(payload || {}));
        console.log('📬 Payload.data:', payload?.data);
        console.log('📬 Payload.senderProfile:', payload?.senderProfile);

        try {
            // Handle different payload formats
            let actualPayload = payload;

            // If payload has a 'data' property that's an object, use that
            if (payload?.data && typeof payload.data === 'object') {
                actualPayload = payload.data;
                console.log('📦 Using nested data object:', actualPayload);
            }

            // Backend sends: { senderProfile: "url", data: "message", envolops: {...} }
            const dataStr = actualPayload.data || actualPayload.message || payload.data || payload.message || '';
            console.log('📝 Data string:', dataStr);

            let title = 'Notification';
            let message = dataStr;
            let notificationType = 'message';
            const currentChatRoomId = getCurrentChatRoomId();

            // Detect notification type from message content
            if (dataStr.includes('New Chat Request From') || dataStr.includes('New Chat Request')) {
                // Chat Request
                notificationType = 'chat_request';
                title = 'New Chat Request';
                message = dataStr;
                console.log('✅ Detected: Chat Request');
            } else if (dataStr.includes('has accepted your chat request') || dataStr.includes('accepted your chat request')) {
                // Request Accepted
                notificationType = 'request_accepted';
                title = 'Request Accepted';
                message = dataStr;
                console.log('✅ Detected: Request Accepted');
            } else if (dataStr.includes('missed call') || dataStr.includes('Missed Call')) {
                // Missed Call
                notificationType = 'missed_call';
                title = 'Missed Call';
                message = dataStr;
                console.log('✅ Detected: Missed Call');
            } else if (dataStr.includes(' : ')) {
                // Message: "John Doe : encrypted_message"
                notificationType = 'message';
                const parts = dataStr.split(' : ');
                title = parts[0]; // Sender name
                const encryptedContent = parts[1];
                console.log('✅ Detected: Message from', title);

                // Don't show if user is in that chat room
                // (We can't check chatRoomId since backend doesn't send it, but we can skip based on sender)
                // For now, always show message notifications

                // Try to decrypt the message if envelopes are provided
                if (payload.envolops && encryptedContent) {
                    try {
                        const privateKey = EncryptionService.decrypt(localStorage.getItem("decryptedBackendData"));

                        if (privateKey) {
                            // Use receiver_envolop since we're the receiver
                            const envolop = payload.envolops.receiver_envolop;

                            if (envolop) {
                                const envolopDecryptKey = await decryptEnvelope(envolop, privateKey);
                                const decryptedContent = await decryptMessage(encryptedContent, envolopDecryptKey);
                                message = decryptedContent;
                                console.log('🔓 Message decrypted:', decryptedContent);
                            } else {
                                message = 'New message'; // Fallback if no envelope
                            }
                        } else {
                            message = 'New message'; // Fallback if no private key
                        }
                    } catch (error) {
                        console.error('❌ Failed to decrypt message:', error);
                        message = 'New message'; // Fallback on error
                    }
                } else {
                    message = encryptedContent || 'New message';
                }
            }

            const notification = {
                id: Date.now() + Math.random(),
                type: notificationType,
                title,
                message,
                senderProfile: actualPayload.senderProfile || payload.senderProfile,
                timestamp: new Date(),
            };

            console.log('🔔 Creating notification:', notification);
            setNotifications((prev) => {
                console.log('📋 Current notifications:', prev.length);
                console.log('📋 Adding notification, new total:', prev.length + 1);
                return [...prev, notification];
            });

            // Play notification sound
            try {
                const audio = new Audio('/notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {
                    // Ignore if sound fails to play
                });
            } catch (error) {
                // Ignore sound errors
            }

        } catch (error) {
            console.error('❌ Error handling notification:', error);
        }
    }, [getCurrentChatRoomId]);

    // Subscribe to notification WebSocket topic
    useEffect(() => {
        if (!connected || !currentUserId || !socket) {
            console.log('⏳ Waiting for WebSocket connection...', { connected, currentUserId, hasSocket: !!socket });
            return;
        }

        const destination = `/topic/notification/${currentUserId}`;
        console.log('🔔 Subscribing to in-app notifications:', destination);

        try {
            const subscription = socket.subscribe(destination, (data) => {
                console.log('📨 Raw notification data:', data);
                handleNotification(data);
            });

            return () => {
                if (subscription) {
                    console.log('🔕 Unsubscribing from in-app notifications');
                    socket.unsubscribe(destination);
                }
            };
        } catch (error) {
            console.error('❌ Error subscribing to notifications:', error);
        }
    }, [connected, currentUserId, socket, handleNotification]);

    const removeNotification = (id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
            <div className="pointer-events-auto">
                {notifications.map((notification, index) => (
                    <div
                        key={notification.id}
                        style={{
                            marginTop: index > 0 ? `${index * 80}px` : '0',
                        }}
                    >
                        <InAppNotification
                            notification={notification}
                            onClose={() => removeNotification(notification.id)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
