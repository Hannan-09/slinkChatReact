import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebSocket } from '../contexts/WebSocketContext';
import InAppNotification from './InAppNotification';
import EncryptionService from '../services/EncryptionService';
import { decryptEnvelope } from '../scripts/decryptEnvelope';
import { decryptMessage } from '../scripts/decryptMessage';
import chatApiService from '../services/ChatApiService';

export default function InAppNotificationManager({ currentUserId }) {
    const [notifications, setNotifications] = useState([]);
    const location = useLocation();
    const socket = useWebSocket();
    const chatRoomMetaCache = useRef(new Map());

    // Get current chat room ID from URL
    const getCurrentChatRoomId = useCallback(() => {
        const match = location.pathname.match(/^\/chat\/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }, [location.pathname]);

    const fetchChatRoomMetadata = useCallback(async (chatRoomId) => {
        const storedUserId = localStorage.getItem('userId');
        const resolvedUserId = currentUserId || (storedUserId ? parseInt(storedUserId) : null);

        if (!chatRoomId || !resolvedUserId) {
            return null;
        }

        const cacheKey = Number(chatRoomId);
        if (chatRoomMetaCache.current.has(cacheKey)) {
            return chatRoomMetaCache.current.get(cacheKey);
        }

        try {
            const response = await chatApiService.getAllChatRooms(resolvedUserId, {
                pageNumber: 1,
                size: 200,
                sortBy: 'createdAt',
                sortDirection: 'desc',
            });

            const rooms = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                    ? response
                    : [];

            const room = rooms.find(
                (roomItem) => Number(roomItem.chatRoomId) === cacheKey
            );

            if (!room) {
                return null;
            }

            const currentIdNum = Number(resolvedUserId);
            const isCurrentUserUser1 =
                Number(room.userId) === currentIdNum ||
                String(room.userId) === String(currentIdNum);

            const otherUserName = isCurrentUserUser1 ? room.user2Name : room.username;
            const otherUserId = isCurrentUserUser1 ? room.user2Id : room.userId;
            const otherUserProfileURL = isCurrentUserUser1
                ? room.user2ProfileURL
                : room.userProfileURL;

            const meta = {
                name: otherUserName || 'Unknown',
                receiverId: otherUserId,
                avatar: otherUserProfileURL || null,
            };

            chatRoomMetaCache.current.set(cacheKey, meta);
            return meta;
        } catch (error) {
            console.error('❌ Failed to fetch chat room metadata for notification:', error);
            return null;
        }
    }, [currentUserId]);

    // Handle incoming notifications from backend (LiveMessage format)
    const decryptNotificationContent = useCallback(async (encryptedContent, envelopes) => {
        if (!encryptedContent) {
            return 'New message';
        }

        try {
            const encryptedPrivateKey = localStorage.getItem('decryptedBackendData');
            if (!encryptedPrivateKey) {
                return 'New message';
            }

            const privateKey = EncryptionService.decrypt(encryptedPrivateKey);
            if (!privateKey) {
                return 'New message';
            }

            const envolop =
                envelopes?.receiver_envolop ||
                envelopes?.receiverEnvolop ||
                envelopes?.receiver_envelope;

            if (!envolop) {
                return 'New message';
            }

            const envolopDecryptKey = await decryptEnvelope(envolop, privateKey);
            const decryptedContent = await decryptMessage(encryptedContent, envolopDecryptKey);
            return decryptedContent || 'New message';
        } catch (error) {
            console.error('❌ Failed to decrypt notification content:', error);
            return 'New message';
        }
    }, []);

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

            const senderNameFromPayload = actualPayload.senderName || payload.senderName || 'Notification';
            let title = senderNameFromPayload;
            let message = dataStr;
            let notificationType = 'message';
            const currentChatRoomId = getCurrentChatRoomId();
            let encryptedContent = dataStr;
            const envelopes = actualPayload.envolops || payload.envolops;
            const payloadChatRoomIdRaw =
                actualPayload.chatRoomId ??
                payload.chatRoomId ??
                actualPayload.chatroomId ??
                payload.chatroomId ??
                null;
            const payloadChatRoomId = payloadChatRoomIdRaw != null ? Number(payloadChatRoomIdRaw) : null;
            const normalizedChatRoomId = Number.isNaN(payloadChatRoomId) ? null : payloadChatRoomId;
            let receiverId = actualPayload.senderId || payload.senderId || null;
            let senderProfile = actualPayload.senderProfile || payload.senderProfile || null;
            let senderName = senderNameFromPayload;

            if (
                currentChatRoomId !== null &&
                normalizedChatRoomId !== null &&
                currentChatRoomId === normalizedChatRoomId
            ) {
                console.log('🚫 Skipping in-app notification for current chat room', currentChatRoomId);
                return;
            }

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
                title = senderName || parts[0]; // Prefer senderName from payload
                encryptedContent = parts[1] || dataStr;
                console.log('✅ Detected: Message from', title);
            }

            // Try to decrypt chat messages using envelopes, fallback to original content
            if (notificationType === 'message' && encryptedContent) {
                if (envelopes) {
                    const decryptedContent = await decryptNotificationContent(encryptedContent, envelopes);
                    message = decryptedContent || 'New message';
                    console.log('🔓 Notification message decrypted:', decryptedContent);
                } else {
                    message = encryptedContent || 'New message';
                }
            }

            // Enrich metadata for navigation if needed
            if (normalizedChatRoomId && (!receiverId || !senderProfile || !senderName || senderName === 'Notification')) {
                const meta = await fetchChatRoomMetadata(normalizedChatRoomId);
                if (meta) {
                    receiverId = receiverId || meta.receiverId || null;
                    senderProfile = senderProfile || meta.avatar || senderProfile;
                    if (!senderName || senderName === 'Notification') {
                        senderName = meta.name || senderName;
                        title = senderName;
                    }
                }
            }

            const notification = {
                id: Date.now() + Math.random(),
                type: notificationType,
                title,
                message,
                senderProfile,
                senderName,
                chatRoomId: normalizedChatRoomId || undefined,
                senderId: actualPayload.senderId || payload.senderId,
                receiverId: receiverId || undefined,
                timestamp: new Date(),
            };

            console.log('🔔 Creating notification:', notification);
            setNotifications(() => {
                console.log('📋 Replacing existing notifications with the latest one');
                return [notification];
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
    }, [getCurrentChatRoomId, decryptNotificationContent, fetchChatRoomMetadata]);

    // Remove notifications that belong to the currently open chat room
    useEffect(() => {
        const activeChatRoomId = getCurrentChatRoomId();
        if (
            activeChatRoomId !== null &&
            notifications.some((notification) => notification.chatRoomId === activeChatRoomId)
        ) {
            console.log('🧹 Clearing notifications for active chat room', activeChatRoomId);
            setNotifications((prev) => prev.filter((n) => n.chatRoomId !== activeChatRoomId));
        }
    }, [getCurrentChatRoomId, notifications]);

    // Subscribe to notification WebSocket topic
    useEffect(() => {
        if (!socket?.connected || !currentUserId) {
            console.log('⏳ Waiting for WebSocket connection...', { 
                connected: socket?.connected, 
                currentUserId, 
                hasSocket: !!socket 
            });
            return;
        }

        const destination = `/topic/notification/${currentUserId}`;
        console.log('🔔 Subscribing to in-app notifications:', destination);

        try {
            const subscription = socket.subscribe(destination, (data, rawMessage) => {
                console.log('📨 Raw notification data:', data);
                console.log('📨 Raw STOMP message:', rawMessage);
                handleNotification(data, rawMessage);
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
    }, [socket?.connected, currentUserId, socket, handleNotification]);

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
