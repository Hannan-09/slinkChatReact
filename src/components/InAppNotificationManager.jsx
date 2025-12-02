import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import InAppNotification from './InAppNotification';
import EncryptionService from '../services/EncryptionService';
import { decryptEnvelope } from '../scripts/decryptEnvelope';
import { decryptMessage } from '../scripts/decryptMessage';

// Import notification sound
import notificationSound from '../assets/notification/notification.mp3';

export default function InAppNotificationManager({ currentUserId }) {
    const [notifications, setNotifications] = useState([]);
    const location = useLocation();
    const socket = useWebSocket();
    const connected = socket?.connected || false;

    // Handle incoming notifications from backend (LiveMessage format)
    const handleNotification = useCallback(async (payload, rawMessage) => {
        console.log('📬 ========== NOTIFICATION RECEIVED ==========');
        console.log('📬 Payload:', JSON.stringify(payload, null, 2));
        console.log('📬 Payload type:', typeof payload);
        console.log('📬 Payload keys:', Object.keys(payload));
        console.log('📬 Raw message:', rawMessage);
        console.log('📬 ==========================================');

        try {
            // Backend sends: { senderProfile: "url", senderName: "name", data: "encrypted_message", envolops: {...}, chatRoomId: 123 }
            const senderProfile = payload.senderProfile || payload.sender_profile || '';
            const senderName = payload.senderName || payload.sender_name || 'Someone';
            const dataStr = payload.data || payload.message || '';
            const envolops = payload.envolops || payload.envelopes || null;
            const chatRoomId = payload.chatRoomId || payload.chat_room_id || payload.roomId;

            console.log('📝 Sender Profile:', senderProfile);
            console.log('📝 Sender Name:', senderName);
            console.log('📝 Sender ID:', payload.senderId);
            console.log('📝 Data string:', dataStr);
            console.log('📝 Envolops:', envolops);
            console.log('📝 Chat Room ID:', chatRoomId);

            let title = senderName;
            let message = dataStr;
            let notificationType = 'message';

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
            } else if (envolops && dataStr) {
                // Encrypted message - decrypt it
                notificationType = 'message';
                title = senderName;
                console.log('✅ Detected: Encrypted message from', senderName);

                // Check if user is currently in this chat room by reading current location
                const currentPath = window.location.pathname;
                const match = currentPath.match(/^\/chat\/(\d+)/);
                const currentChatRoomId = match ? parseInt(match[1]) : null;

                if (currentChatRoomId && chatRoomId && currentChatRoomId === chatRoomId) {
                    console.log('⏭️ User is in chat room', chatRoomId, '- skipping notification');
                    return; // Don't show notification if user is in the chat
                }

                try {
                    const privateKey = EncryptionService.decrypt(localStorage.getItem("decryptedBackendData"));

                    if (privateKey) {
                        // Use receiver_envolop since we're the receiver
                        const envolop = envolops.receiver_envolop;

                        if (envolop) {
                            console.log('🔐 Decrypting notification message...');
                            const envolopDecryptKey = await decryptEnvelope(envolop, privateKey);
                            const decryptedContent = await decryptMessage(dataStr, envolopDecryptKey);
                            message = decryptedContent;
                            console.log('🔓 Notification message decrypted:', decryptedContent);
                        } else {
                            message = 'New message';
                            console.log('⚠️ No receiver envelope found');
                        }
                    } else {
                        message = 'New message';
                        console.log('⚠️ No private key found');
                    }
                } catch (error) {
                    console.error('❌ Failed to decrypt notification message:', error);
                    message = 'New message';
                }
            } else {
                // Plain text message or unknown format
                message = dataStr || 'New notification';
                console.log('✅ Plain text notification');
            }

            // Extract senderId - try multiple possible fields
            const senderId = payload.senderId || payload.sender_id || payload.sender?.id || payload.sender?.userId || '';

            console.log('🔍 Extracting senderId from payload:', {
                'payload.senderId': payload.senderId,
                'payload.sender_id': payload.sender_id,
                'payload.sender': payload.sender,
                'extracted senderId': senderId
            });

            const notification = {
                id: Date.now() + Math.random(),
                type: notificationType,
                title,
                message,
                senderProfile: senderProfile,
                senderName: senderName,
                chatRoomId: chatRoomId,
                senderId: senderId,
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
                const audio = new Audio();
                audio.volume = 0.5;
                audio.preload = 'auto';

                // Add error listener
                audio.addEventListener('error', (e) => {
                    console.warn('Notification sound error:', e);
                });

                // Set source safely from imported asset
                try {
                    audio.src = notificationSound;
                    audio.load();
                    audio.play().catch((err) => {
                        // Silently handle autoplay policy errors
                        if (err.name !== 'NotAllowedError') {
                            console.warn('Notification sound play error:', err.message);
                        }
                    });
                } catch (srcError) {
                    console.warn('Failed to load notification sound:', srcError);
                }
            } catch (error) {
                console.warn('Notification sound initialization error:', error);
            }

        } catch (error) {
            console.error('❌ Error handling notification:', error);
        }
    }, []); // No dependencies - stable function

    // Subscribe to notification WebSocket topic
    useEffect(() => {
        console.log('🔍 InAppNotificationManager useEffect triggered:', {
            connected,
            currentUserId,
            hasSocket: !!socket,
            socketType: typeof socket,
            socketKeys: socket ? Object.keys(socket) : []
        });

        if (!connected || !currentUserId || !socket) {
            console.log('⏳ Waiting for WebSocket connection...', {
                connected,
                currentUserId,
                hasSocket: !!socket,
                socketConnected: socket?.connected
            });
            return;
        }

        const destination = `/topic/notification/${currentUserId}`;
        console.log('🔔 ========================================');
        console.log('🔔 SUBSCRIBING TO IN-APP NOTIFICATIONS');
        console.log('🔔 Destination:', destination);
        console.log('🔔 User ID:', currentUserId);
        console.log('🔔 Socket connected:', socket.connected);
        console.log('🔔 ========================================');

        // Create a stable reference to handleNotification
        const notificationHandler = (data, rawMessage) => {
            console.log('  =========================================');
            console.log('📨 NOTIFICATION RECEIVED ON TOPIC:', destination);
            console.log('📨 Data:', data);
            console.log('📨 Raw message:', rawMessage);
            console.log('📨 ========================================');
            handleNotification(data, rawMessage);
        };

        try {
            const subscription = socket.subscribe(destination, notificationHandler);

            if (subscription) {
                console.log('✅ ========================================');
                console.log('✅ SUCCESSFULLY SUBSCRIBED TO NOTIFICATIONS');
                console.log('✅ Destination:', destination);
                console.log('✅ Subscription object:', subscription);
                console.log('✅ ========================================');
            } else {
                console.error('❌ ========================================');
                console.error('❌ SUBSCRIPTION FAILED - RETURNED NULL');
                console.error('❌ Destination:', destination);
                console.error('❌ ========================================');
            }

            return () => {
                if (subscription) {
                    console.log('🔕 Unsubscribing from in-app notifications:', destination);
                    socket.unsubscribe(destination);
                }
            };
        } catch (error) {
            console.error('❌ ========================================');
            console.error('❌ ERROR SUBSCRIBING TO NOTIFICATIONS');
            console.error('❌ Error:', error);
            console.error('❌ Stack:', error.stack);
            console.error('❌ ========================================');
        }
    }, [connected, currentUserId, socket]); // Removed handleNotification from dependencies

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