import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IoChatbubbles,
    IoChatbubblesOutline,
    IoPersonAdd,
    IoSearch,
    IoCall,
    IoPeopleOutline,
    IoSettingsOutline,
    IoImages,
    IoPlayCircle,
    IoDocumentText,
    IoMic,
    IoCamera
} from 'react-icons/io5';
import { Colors } from '../constants/Colors';
import { ApiUtils, UserAPI } from '../services/AuthService';
import chatApiService from '../services/ChatApiService';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../contexts/ToastContext';

export default function ChatsScreen() {
    const navigate = useNavigate();
    const socket = useWebSocket();
    const toast = useToast();
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userProfile, setUserProfile] = useState({
        avatarUrl: '',
        initials: '',
    });
    const [currentUserId, setCurrentUserId] = useState(null);

    // Delete chat room states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Track processed messages to prevent duplicates
    const processedMessagesRef = useRef(new Set());

    // Track subscribed room IDs to prevent unnecessary re-subscriptions
    const subscribedRoomsRef = useRef(new Set());

    // Pagination state for chat rooms
    const PAGE_SIZE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const buildInitials = (firstName, lastName, username) => {
        const safeFirst = (firstName || '').trim();
        const safeLast = (lastName || '').trim();
        const safeUsername = (username || '').trim();

        const firstInitial =
            (safeFirst && safeFirst.charAt(0)) ||
            (safeUsername && safeUsername.charAt(0)) ||
            '';
        const lastInitial = safeLast && safeLast.charAt(0);

        const combined = `${firstInitial}${lastInitial || ''}`;
        return combined ? combined.toUpperCase() : 'SC';
    };

    // Helper to truncate long message previews
    const truncateMessage = (text, maxLength = 20) => {
        if (!text) return '';
        const trimmed = text.trim();
        if (trimmed.length <= maxLength) return trimmed;
        return `${trimmed.slice(0, maxLength)}...`;
    };

    const loadUserProfile = async (userId) => {
        try {
            const result = await UserAPI.getProfile(userId);
            if (result.success && result.data?.data) {
                const profile = result.data.data;
                const avatarUrl = profile.profileURL || null;
                const initials = buildInitials(
                    profile.firstName,
                    profile.lastName,
                    profile.username
                );
                setUserProfile({
                    avatarUrl,
                    initials,
                });
            } else {
                console.error('Failed to load user profile:', result.error);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    useEffect(() => {
        const initializeScreen = async () => {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);
            loadChatRooms(1, true);
        };
        initializeScreen();
    }, []);

    // Handle real-time WebSocket messages to update chat list
    const handleWebSocketMessage = useCallback(async (message) => {
        console.log('📨 ChatsScreen received WebSocket message:', message);

        if (!message || !message.chatRoomId) {
            console.log('⚠️ Invalid message format, skipping update');
            return;
        }

        try {
            // Import decryption services
            const EncryptionService = (await import('../services/EncryptionService')).default;
            const { decryptEnvelope } = await import('../scripts/decryptEnvelope');
            const { decryptMessage } = await import('../scripts/decryptMessage');

            const privateKey = EncryptionService.decrypt(localStorage.getItem("decryptedBackendData"));
            const userIdString = localStorage.getItem("userId");

            let decryptedContent = message.content || '';

            // Decrypt message content if encrypted
            if (message.content && privateKey) {
                try {
                    const envolop = (message.senderId?.toString() === userIdString)
                        ? message.sender_envolop
                        : message.receiver_envolop;

                    if (envolop) {
                        const envolopDecryptKey = await decryptEnvelope(envolop, privateKey);
                        decryptedContent = await decryptMessage(message.content, envolopDecryptKey);
                    }
                } catch (error) {
                    console.error("❌ Failed to decrypt WebSocket message:", error);
                }
            }

            // Update chat rooms list
            setChatRooms((prevRooms) => {
                // Find the chat room that received the message
                const roomIndex = prevRooms.findIndex(
                    (room) => room.chatRoomId === message.chatRoomId
                );

                if (roomIndex === -1) {
                    console.log('⚠️ Chat room not found in list, skipping update');
                    return prevRooms;
                }

                const updatedRooms = [...prevRooms];
                const updatedRoom = { ...updatedRooms[roomIndex] };

                // Determine message preview
                let previewType = 'text';
                let messagePreview = '';

                const attachments = Array.isArray(message.attachments) ? message.attachments : [];

                // Check if message is deleted
                if (message.isDeleted) {
                    previewType = 'meta';
                    messagePreview = 'Message deleted';
                } else if (decryptedContent && decryptedContent.trim().length > 0) {
                    previewType = 'text';
                    // Add "Edited" prefix if message was edited
                    messagePreview = message.isEdited
                        ? `Edited: ${truncateMessage(decryptedContent)}`
                        : truncateMessage(decryptedContent);
                } else if (attachments.length > 0) {
                    const firstAttachment = attachments[0];
                    const fileType = (firstAttachment.fileType || '').toLowerCase();

                    if (fileType.startsWith('image/')) {
                        previewType = 'image';
                        messagePreview = 'Photo';
                    } else if (fileType.startsWith('video/')) {
                        previewType = 'video';
                        messagePreview = 'Video';
                    } else if (fileType.startsWith('audio/')) {
                        previewType = 'audio';
                        messagePreview = 'Audio';
                    } else {
                        previewType = 'document';
                        messagePreview = 'Document';
                    }
                } else {
                    messagePreview = 'New message';
                }

                // Update room details
                updatedRoom.message = messagePreview;
                updatedRoom.previewType = previewType;
                updatedRoom.time = formatTime(message.timestamp || message.sentAt || new Date().toISOString());
                updatedRoom.isEdited = message.isEdited || false;
                updatedRoom.lastMessageId = message.chatMessageId || message.id;

                // Increment unread count only if message is from another user
                if (message.senderId?.toString() !== userIdString) {
                    updatedRoom.unreadCount = (updatedRoom.unreadCount || 0) + 1;
                }

                // Remove the room from its current position
                updatedRooms.splice(roomIndex, 1);

                // Add it to the top
                updatedRooms.unshift(updatedRoom);

                console.log('✅ Chat room updated and moved to top:', updatedRoom.name);
                return updatedRooms;
            });
        } catch (error) {
            console.error('❌ Error handling WebSocket message in ChatsScreen:', error);
        }
    }, []);

    // Handle message edit events
    const handleMessageEdit = useCallback(async (editMsg) => {
        console.log('✏️✏️✏️ ChatsScreen received EDIT message:', JSON.stringify(editMsg, null, 2));

        const messageData = editMsg.data || editMsg;
        const chatRoomId = messageData.chatRoomId;
        const editedMessageId = messageData.chatMessageId;

        console.log('📝 Edit details:', {
            chatRoomId,
            editedMessageId,
            hasContent: !!messageData.content,
            messageData
        });

        if (!chatRoomId) {
            console.log('❌ No chatRoomId in edit message');
            return;
        }

        try {
            // Import decryption services
            const EncryptionService = (await import('../services/EncryptionService')).default;
            const { decryptEnvelope } = await import('../scripts/decryptEnvelope');
            const { decryptMessage } = await import('../scripts/decryptMessage');

            const privateKey = EncryptionService.decrypt(localStorage.getItem("decryptedBackendData"));
            const userIdString = localStorage.getItem("userId");

            let decryptedContent = messageData.content || '';

            // Decrypt edited message content if encrypted
            if (messageData.content && privateKey) {
                try {
                    const envolop = (messageData.senderId?.toString() === userIdString)
                        ? messageData.sender_envolop
                        : messageData.receiver_envolop;

                    if (envolop) {
                        const envolopDecryptKey = await decryptEnvelope(envolop, privateKey);
                        decryptedContent = await decryptMessage(messageData.content, envolopDecryptKey);
                        console.log('🔓 Decrypted edited content:', decryptedContent);
                    }
                } catch (error) {
                    console.error("❌ Failed to decrypt edited message:", error);
                }
            }

            // Update chat rooms list with edited message - ALWAYS update since backend sends this for last message
            setChatRooms((prevRooms) => {
                const roomIndex = prevRooms.findIndex((room) => room.chatRoomId === chatRoomId);

                if (roomIndex === -1) {
                    console.log('⚠️ Chat room not found for edit, chatRoomId:', chatRoomId);
                    console.log('Available rooms:', prevRooms.map(r => ({ id: r.chatRoomId, name: r.name })));
                    return prevRooms;
                }

                const updatedRooms = [...prevRooms];
                const updatedRoom = { ...updatedRooms[roomIndex] };

                // Update preview with edited content and "Edited:" prefix
                updatedRoom.message = `Edited: ${truncateMessage(decryptedContent)}`;
                updatedRoom.previewType = 'text';
                updatedRoom.time = formatTime(messageData.editedAt || new Date().toISOString());
                updatedRoom.isEdited = true;
                updatedRoom.lastMessageId = editedMessageId;

                // Put the updated room back into the array
                updatedRooms[roomIndex] = updatedRoom;

                console.log('✅✅✅ Chat room UPDATED with edited message:', updatedRoom.name, updatedRoom.message);
                return updatedRooms;
            });
        } catch (error) {
            console.error('❌ Error handling edit message in ChatsScreen:', error);
        }
    }, []);

    // Handle message delete events
    const handleMessageDelete = useCallback((deleteMsg) => {
        console.log('🗑️🗑️🗑️ ChatsScreen received DELETE message:', JSON.stringify(deleteMsg, null, 2));

        const messageData = deleteMsg.data || deleteMsg;
        const chatRoomId = messageData.chatRoomId;
        const deletedMessageId = messageData.chatMessageId;

        console.log('🗑️ Delete details:', {
            chatRoomId,
            deletedMessageId,
            messageData
        });

        if (!chatRoomId) {
            console.log('❌ No chatRoomId in delete message');
            return;
        }

        // Update chat rooms list with deleted message - ALWAYS update since backend sends this for last message
        setChatRooms((prevRooms) => {
            const roomIndex = prevRooms.findIndex((room) => room.chatRoomId === chatRoomId);

            if (roomIndex === -1) {
                console.log('⚠️ Chat room not found for delete, chatRoomId:', chatRoomId);
                console.log('Available rooms:', prevRooms.map(r => ({ id: r.chatRoomId, name: r.name })));
                return prevRooms;
            }

            const updatedRooms = [...prevRooms];
            const updatedRoom = { ...updatedRooms[roomIndex] };

            // Update preview to show "Message deleted"
            updatedRoom.message = 'Message deleted';
            updatedRoom.previewType = 'meta';
            updatedRoom.time = formatTime(messageData.deletedAt || new Date().toISOString());
            updatedRoom.isEdited = false;
            updatedRoom.lastMessageId = deletedMessageId;

            // Put the updated room back into the array
            updatedRooms[roomIndex] = updatedRoom;

            console.log('✅✅✅ Chat room UPDATED with deleted message:', updatedRoom.name, updatedRoom.message);
            return updatedRooms;
        });
    }, []);

    // Subscribe to all chat rooms for real-time updates
    useEffect(() => {
        if (!socket.connected || !currentUserId || chatRooms.length === 0) {
            return;
        }

        // Get current room IDs
        const currentRoomIds = new Set(chatRooms.map(r => r.chatRoomId).filter(Boolean));

        // Check if room IDs have actually changed
        const roomIdsChanged =
            currentRoomIds.size !== subscribedRoomsRef.current.size ||
            [...currentRoomIds].some(id => !subscribedRoomsRef.current.has(id));

        if (!roomIdsChanged) {
            console.log('🔌 Room IDs unchanged, skipping re-subscription');
            return;
        }

        console.log('🔌 ChatsScreen subscribing to all chat rooms:', chatRooms.length);
        subscribedRoomsRef.current = currentRoomIds;

        const subscriptions = [];

        // Subscribe to each chat room
        chatRooms.forEach((room) => {
            if (!room.chatRoomId || !room.receiverId) {
                return;
            }

            // Subscribe as receiver (messages sent TO us)
            const receiverDestination = `/topic/chat/${room.chatRoomId}/${room.receiverId}/${currentUserId}`;

            console.log('🔌 Subscribing to:', receiverDestination);

            const subscription = socket.subscribe(receiverDestination, (message) => {
                // Create unique message ID
                const messageId = `${message.chatMessageId || message.id}-${message.chatRoomId}-${message.timestamp}`;

                // Skip if already processed
                if (processedMessagesRef.current.has(messageId)) {
                    console.log('Skipping duplicate message:', messageId);
                    return;
                }

                processedMessagesRef.current.add(messageId);
                console.log('Received NEW message on ChatsScreen for room:', room.chatRoomId);
                handleWebSocketMessage(message);

                // Clean up after 10 seconds
                setTimeout(() => {
                    processedMessagesRef.current.delete(messageId);
                }, 10000);
            });

            if (subscription) {
                subscriptions.push({ destination: receiverDestination, subscription });
            }

            // Subscribe to edit messages for this chat room
            const editSenderDestination = `/topic/chat/edit/${room.chatRoomId}/${currentUserId}/${room.receiverId}`;
            const editReceiverDestination = `/topic/chat/edit/${room.chatRoomId}/${room.receiverId}/${currentUserId}`;

            console.log('🔌📝 Subscribing to EDIT (sender):', editSenderDestination);
            const editSenderSub = socket.subscribe(editSenderDestination, (msg) => {
                console.log('📨📝 EDIT message received on sender channel:', msg);
                handleMessageEdit(msg);
            });
            if (editSenderSub) {
                subscriptions.push({ destination: editSenderDestination, subscription: editSenderSub });
                console.log('✅ Edit sender subscription successful');
            } else {
                console.log('❌ Edit sender subscription FAILED');
            }

            console.log('🔌📝 Subscribing to EDIT (receiver):', editReceiverDestination);
            const editReceiverSub = socket.subscribe(editReceiverDestination, (msg) => {
                console.log('📨📝 EDIT message received on receiver channel:', msg);
                handleMessageEdit(msg);
            });
            if (editReceiverSub) {
                subscriptions.push({ destination: editReceiverDestination, subscription: editReceiverSub });
                console.log('✅ Edit receiver subscription successful');
            } else {
                console.log('❌ Edit receiver subscription FAILED');
            }

            // Subscribe to delete messages for this chat room
            const deleteDestination = `/topic/chat/${room.chatRoomId}/delete`;

            console.log('🔌🗑️ Subscribing to DELETE:', deleteDestination);
            const deleteSub = socket.subscribe(deleteDestination, (msg) => {
                console.log('📨🗑️ DELETE message received:', msg);
                handleMessageDelete(msg);
            });
            if (deleteSub) {
                subscriptions.push({ destination: deleteDestination, subscription: deleteSub });
                console.log('✅ Delete subscription successful');
            } else {
                console.log('❌ Delete subscription FAILED');
            }
        });

        // Cleanup subscriptions when component unmounts or chatRooms change
        return () => {
            console.log('🔌 ChatsScreen unsubscribing from all chat rooms');
            subscriptions.forEach(({ destination }) => {
                socket.unsubscribe(destination);
            });
        };
    }, [socket.connected, currentUserId, chatRooms, handleWebSocketMessage, handleMessageEdit, handleMessageDelete]);



    // Search chat rooms with API
    const searchChatRooms = async (query) => {
        if (!query.trim()) {
            // If search is empty, reload all chat rooms
            loadChatRooms(1, true);
            return;
        }

        try {
            setLoading(true);
            const userId = await ApiUtils.getCurrentUserId();

            if (!userId) {
                console.error('User ID not found');
                return;
            }

            const result = await chatApiService.searchChatRooms(query, userId, {
                pageNumber: 1,
                size: 50,
                sortBy: 'lastMessageAt',
                sortDirection: 'desc',
            });

            console.log('🔍 Search API result:', result);

            // Extract data from response - handle different response structures
            const roomsData = result?.data?.data
                ? (Array.isArray(result.data.data) ? result.data.data : [])
                : result?.data
                    ? (Array.isArray(result.data) ? result.data : [])
                    : Array.isArray(result) ? result : [];

            console.log('🔍 Extracted rooms data:', roomsData);

            // Import decryption services
            const EncryptionService = (await import('../services/EncryptionService')).default;
            const { decryptEnvelope } = await import('../scripts/decryptEnvelope');
            const { decryptMessage } = await import('../scripts/decryptMessage');

            const privateKey = EncryptionService.decrypt(localStorage.getItem("decryptedBackendData"));
            const userIdString = localStorage.getItem("userId");

            const transformedRooms = await Promise.all(
                roomsData.map(async (room) => {
                    const isCurrentUserUser1 = room.userId === userId;
                    const otherUserName = isCurrentUserUser1 ? room.user2Name : room.username;
                    const otherUserId = isCurrentUserUser1 ? room.user2Id : room.userId;
                    const otherUserProfileURL = isCurrentUserUser1 ? room.user2ProfileURL : room.userProfileURL;

                    const lastMessage = room.lastMessage || null;
                    const lastMessageAt = (lastMessage && lastMessage.sentAt) || room.lastMessageAt || room.lastMessageTime || null;
                    const unseenCount = typeof room.unseenMessageCount === 'number' ? room.unseenMessageCount : room.unreadCount || 0;

                    let lastMessageContent = (lastMessage && lastMessage.content) || room.lastMessageText || '';

                    if (lastMessage && lastMessage.content && privateKey) {
                        try {
                            const envolop = (lastMessage.senderId?.toString() === userIdString) ? lastMessage.sender_envolop : lastMessage.receiver_envolop;
                            if (envolop) {
                                const envolopDecryptKey = await decryptEnvelope(envolop, privateKey);
                                lastMessageContent = await decryptMessage(lastMessage.content, envolopDecryptKey);
                            }
                        } catch (error) {
                            console.error("❌ Failed to decrypt last message:", error);
                        }
                    }

                    let previewType = 'text';
                    let messagePreview = '';
                    const attachments = lastMessage && Array.isArray(lastMessage.attachments) ? lastMessage.attachments : [];

                    if (lastMessage && lastMessage.isDeleted) {
                        previewType = 'meta';
                        messagePreview = 'Message deleted';
                    } else if (lastMessageContent && lastMessageContent.trim().length > 0) {
                        previewType = 'text';
                        // Add "Edited" prefix if message was edited
                        messagePreview = (lastMessage && lastMessage.isEdited)
                            ? `Edited: ${truncateMessage(lastMessageContent)}`
                            : truncateMessage(lastMessageContent);
                    } else if (attachments.length > 0) {
                        const firstAttachment = attachments[0];
                        const fileType = (firstAttachment.fileType || '').toLowerCase();
                        if (fileType.startsWith('image/')) {
                            previewType = 'image';
                            messagePreview = 'Photo';
                        } else if (fileType.startsWith('video/')) {
                            previewType = 'video';
                            messagePreview = 'Video';
                        } else if (fileType.startsWith('audio/')) {
                            previewType = 'audio';
                            messagePreview = 'Audio';
                        } else {
                            previewType = 'document';
                            messagePreview = 'Document';
                        }
                    } else if (lastMessageAt) {
                        previewType = 'meta';
                        messagePreview = formatTime(lastMessageAt);
                    } else {
                        previewType = 'meta';
                        messagePreview = 'No messages yet';
                    }

                    const nameForInitials = otherUserName || '';
                    const nameParts = nameForInitials.trim().split(' ').filter(Boolean);
                    const firstName = nameParts[0] || nameForInitials;
                    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                    const initials = buildInitials(firstName, lastName, otherUserName);

                    return {
                        id: room.chatRoomId?.toString(),
                        chatRoomId: room.chatRoomId,
                        name: otherUserName || 'Unknown User',
                        message: messagePreview,
                        time: lastMessageAt ? formatTime(lastMessageAt) : '',
                        unreadCount: unseenCount,
                        avatar: otherUserProfileURL || null,
                        receiverId: otherUserId,
                        previewType,
                        initials,
                        isEdited: lastMessage && lastMessage.isEdited ? true : false,
                        lastMessageId: lastMessage ? lastMessage.chatMessageId : null,
                    };
                })
            );

            setChatRooms(transformedRooms);
            setHasMore(false); // Disable pagination for search results
            console.log('✅ Search results set to chatRooms:', transformedRooms.length, 'rooms');
        } catch (error) {
            console.error('Error searching chat rooms:', error);
            toast.error('Failed to search chat rooms');
        } finally {
            setLoading(false);
        }
    };

    // Debounced search effect
    useEffect(() => {
        if (searchQuery.length > 0) {
            const timeoutId = setTimeout(() => {
                searchChatRooms(searchQuery);
            }, 500); // Wait 500ms after user stops typing
            return () => clearTimeout(timeoutId);
        } else {
            // Reload all chats when search is cleared
            loadChatRooms(1, true);
        }
    }, [searchQuery]);

    // Delete chat room handlers
    const handleDeleteChat = (chat, event) => {
        event.stopPropagation(); // Prevent navigation to chat
        setChatToDelete(chat);
        setShowDeleteDialog(true);
    };

    const confirmDeleteChat = async () => {
        if (!chatToDelete) return;

        setDeleting(true);
        try {
            const result = await chatApiService.deleteChatRoom(chatToDelete.id);

            if (result.success !== false) {
                // Remove chat from local state
                setChatRooms(prevChats => prevChats.filter(chat => chat.id !== chatToDelete.id));
                toast.success('Chat deleted successfully');
            } else {
                toast.error(result.message || 'Failed to delete chat');
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            toast.error('Failed to delete chat');
        } finally {
            setDeleting(false);
            setShowDeleteDialog(false);
            setChatToDelete(null);
        }
    };

    const cancelDeleteChat = () => {
        setShowDeleteDialog(false);
        setChatToDelete(null);
    };

    const loadChatRooms = async (pageToLoad = 1, reset = false) => {
        try {
            const isFirstPage = pageToLoad === 1;
            if (isFirstPage || reset) {
                setLoading(true);
                setHasMore(true);
            } else {
                setIsLoadingMore(true);
            }

            // Debug: Check all stored data
            const rawUserId = localStorage.getItem('userId');
            const rawUser = localStorage.getItem('user');
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            // Get stored userId from login
            const userId = await ApiUtils.getCurrentUserId();
            // Also check if user data exists as backup
            const userData = await ApiUtils.getStoredUser();
            // Try to get userId from multiple sources
            let finalUserId = userId || userData?.userId || userData?.id;

            // If still no userId, try parsing the old format
            if (!finalUserId && userData?.id) {
                finalUserId = parseInt(userData.id);
            }

            if (!finalUserId) {
                toast.error('User not logged in. Please login again.');
                navigate('/login');
                return;
            }

            // Load current user's profile for header avatar (only once on first load)
            if (isFirstPage && reset) {
                await loadUserProfile(finalUserId);
            }

            // Call the real API for the requested page
            const response = await chatApiService.getAllChatRooms(finalUserId, {
                pageNumber: pageToLoad,
                size: PAGE_SIZE,
                sortBy: 'createdAt',
                sortDirection: 'desc',
            });
            // Transform API response to match UI expectations
            const roomsData = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                    ? response
                    : [];

            // Import decryption services
            const EncryptionService = (await import('../services/EncryptionService')).default;
            const { decryptEnvelope } = await import('../scripts/decryptEnvelope');
            const { decryptMessage } = await import('../scripts/decryptMessage');

            const privateKey = EncryptionService.decrypt(localStorage.getItem("decryptedBackendData"));
            const userIdString = localStorage.getItem("userId");

            const transformedChatRooms = await Promise.all(
                roomsData.map(async (room) => {
                    // Determine which user is the "other" user (not the current user)
                    const isCurrentUserUser1 = room.userId === finalUserId;
                    const otherUserName = isCurrentUserUser1
                        ? room.user2Name
                        : room.username;
                    const otherUserId = isCurrentUserUser1 ? room.user2Id : room.userId;
                    const otherUserProfileURL = isCurrentUserUser1
                        ? room.user2ProfileURL
                        : room.userProfileURL;

                    // Backend fields:
                    // - lastMessage: full last message object (with content, attachments & sentAt)
                    // - lastMessageAt / lastMessageTime: timestamps for last message
                    // - createdAt: room creation time (used ONLY for "no messages yet" state)
                    // - unseenMessageCount: number of unread messages for current user
                    const lastMessage = room.lastMessage || null;
                    const lastMessageAt =
                        (lastMessage && lastMessage.sentAt) ||
                        room.lastMessageAt ||
                        room.lastMessageTime ||
                        null;
                    const unseenCount =
                        typeof room.unseenMessageCount === 'number'
                            ? room.unseenMessageCount
                            : room.unreadCount || 0;

                    // Decrypt last message content if encrypted
                    let lastMessageContent = (lastMessage && lastMessage.content) || room.lastMessageText || '';

                    if (lastMessage && lastMessage.content && privateKey) {
                        try {
                            const envolop = (lastMessage.senderId?.toString() === userIdString)
                                ? lastMessage.sender_envolop
                                : lastMessage.receiver_envolop;

                            if (envolop) {
                                const envolopDecryptKey = await decryptEnvelope(envolop, privateKey);
                                lastMessageContent = await decryptMessage(lastMessage.content, envolopDecryptKey);
                            }
                        } catch (error) {
                            console.error("❌ Failed to decrypt last message:", error);
                        }
                    }

                    // Decrypt replyTo content in last message if exists
                    if (lastMessage && lastMessage.replyTo && lastMessage.replyTo.content && privateKey) {
                        try {
                            const replyEnvolop = (lastMessage.replyTo.senderId?.toString() === userIdString)
                                ? lastMessage.replyTo.sender_envolop
                                : lastMessage.replyTo.receiver_envolop;

                            if (replyEnvolop) {
                                const replyEnvolopKey = await decryptEnvelope(replyEnvolop, privateKey);
                                const decryptedReplyContent = await decryptMessage(lastMessage.replyTo.content, replyEnvolopKey);
                                // Update the replyTo object with decrypted content
                                lastMessage.replyTo = {
                                    ...lastMessage.replyTo,
                                    content: decryptedReplyContent
                                };
                            }
                        } catch (error) {
                            console.error("❌ Failed to decrypt last message reply:", error);
                        }
                    }

                    // Attachment-aware preview: if no text but there are attachments, show type label
                    let previewType = 'text';
                    let messagePreview = '';

                    const attachments =
                        lastMessage && Array.isArray(lastMessage.attachments)
                            ? lastMessage.attachments
                            : [];

                    // Check if message is deleted
                    if (lastMessage && lastMessage.isDeleted) {
                        previewType = 'meta';
                        messagePreview = 'Message deleted';
                    } else if (lastMessageContent && lastMessageContent.trim().length > 0) {
                        previewType = 'text';
                        // Add "Edited" prefix if message was edited
                        messagePreview = (lastMessage && lastMessage.isEdited)
                            ? `Edited: ${truncateMessage(lastMessageContent)}`
                            : truncateMessage(lastMessageContent);
                    } else if (attachments.length > 0) {
                        const firstAttachment = attachments[0];
                        const fileType = (firstAttachment.fileType || '').toLowerCase();

                        if (fileType.startsWith('image/')) {
                            previewType = 'image';
                            messagePreview = 'Photo';
                        } else if (fileType.startsWith('video/')) {
                            previewType = 'video';
                            messagePreview = 'Video';
                        } else if (fileType.startsWith('audio/')) {
                            previewType = 'audio';
                            messagePreview = 'Audio';
                        } else {
                            previewType = 'document';
                            messagePreview = 'Document';
                        }
                    } else if (lastMessageAt) {
                        previewType = 'meta';
                        messagePreview = formatTime(lastMessageAt);
                    } else {
                        previewType = 'meta';
                        messagePreview = 'No messages yet';
                    }

                    // Build initials from other user's name (first letter of first & last name)
                    const nameForInitials = otherUserName || '';
                    const nameParts = nameForInitials.trim().split(' ').filter(Boolean);
                    const firstName = nameParts[0] || nameForInitials;
                    const lastName =
                        nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                    const initials = buildInitials(firstName, lastName, otherUserName);

                    return {
                        id: room.chatRoomId?.toString(),
                        chatRoomId: room.chatRoomId,
                        name: otherUserName || 'Unknown User',
                        message: messagePreview,
                        // Show time ONLY if we have a real last message timestamp;
                        // for rooms with no messages, keep this empty so UI can just show "No messages yet".
                        time: lastMessageAt ? formatTime(lastMessageAt) : '',
                        unreadCount: unseenCount,
                        avatar: otherUserProfileURL || null,
                        receiverId: otherUserId,
                        previewType,
                        initials,
                        isEdited: lastMessage && lastMessage.isEdited ? true : false,
                        lastMessageId: lastMessage ? lastMessage.chatMessageId : null,
                    };
                })
            );

            if (isFirstPage || reset) {
                setChatRooms(transformedChatRooms);
            } else {
                // Append new page at the bottom, avoiding duplicates by chatRoomId
                setChatRooms((prev) => {
                    const existingIds = new Set(
                        prev.map((room) => room.chatRoomId || room.id)
                    );
                    const filteredNew = transformedChatRooms.filter(
                        (room) =>
                            !existingIds.has(room.chatRoomId || room.id)
                    );
                    return [...prev, ...filteredNew];
                });
            }

            setCurrentPage(pageToLoad);
            if (transformedChatRooms.length < PAGE_SIZE) {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading chat rooms:', error);
            // alert('Failed to load chat rooms');
            setChatRooms([]);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    };

    // Helper function to format time (12-hour format)
    const formatTime = (timestamp) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            });
        } catch (error) {
            return '12:00';
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        setCurrentPage(1);
        await loadChatRooms(1, true);
        setRefreshing(false);
    };

    const handleScroll = (e) => {
        const { scrollTop, clientHeight, scrollHeight } = e.target;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 80;

        // Only paginate on main list (not when filtering by search)
        if (
            isNearBottom &&
            hasMore &&
            !isLoadingMore &&
            !loading &&
            !searchQuery.trim()
        ) {
            const nextPage = currentPage + 1;
            loadChatRooms(nextPage);
        }
    };

    // Use chatRooms directly since API search is handled
    const filteredChatRooms = chatRooms;

    const handleChatClick = (item) => {
        try {
            navigate(
                `/chat/${item.chatRoomId || 0}?name=${encodeURIComponent(
                    item.name || 'Unknown'
                )}&avatar=${encodeURIComponent(
                    item.avatar || ''
                )}&receiverId=${item.receiverId || 0}`
            );
        } catch (error) {
            console.error('Error navigating to chat:', error);
        }
    };

    return (
        <div className="h-screen bg-[#1a1a1a] flex flex-col overflow-hidden safe-area-top">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center">
                    {/* Header profile - 3D avatar ring with dynamic user profile */}
                    <div className="w-10 h-10 rounded-full mr-4 bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_14px_22px_rgba(0,0,0,0.96),0_0_0_1px_rgba(255,255,255,0.14),inset_0_3px_4px_rgba(255,255,255,0.22),inset_0_-4px_7px_rgba(0,0,0,0.95),inset_3px_0_4px_rgba(255,255,255,0.18),inset_-3px_0_4px_rgba(0,0,0,0.8)] border border-black/70 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#181818] to-[#050505] shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-3px_5px_rgba(0,0,0,0.95)] flex items-center justify-center overflow-hidden">
                            {userProfile.avatarUrl ? (
                                <img
                                    src={userProfile.avatarUrl}
                                    alt="Profile"
                                    onClick={() => navigate('/settings')}
                                    className="w-7 h-7 rounded-full cursor-pointer object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src =
                                            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';
                                    }}
                                />
                            ) : (
                                <span
                                    onClick={() => navigate('/settings')}
                                    className="text-xs font-semibold text-white cursor-pointer">
                                    {userProfile.initials}
                                </span>
                            )}
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Chats</h1>
                </div>
                {/* Header buttons */}
                <div className="flex items-center gap-3">
                    {/* Add friend / new chat button */}
                    <button
                        onClick={() => navigate('/search')}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            <IoPersonAdd className="text-white text-lg sm:text-xl" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Search Bar - glassy, same background style as bottom nav */}
            <div className="px-5 mb-5">
                <div className="flex items-center rounded-full px-5 py-3 bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding">
                    <IoSearch className="text-gray-300 text-xl mr-4" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="flex-1 bg-transparent text-gray-200 outline-none placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Chat List - contained width similar to header/search and bottom nav */}
            <div
                className="flex-1 overflow-y-auto px-4 sm:px-5 scrollbar-hide"
                onScroll={handleScroll}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-gray-400 text-lg">Loading chats...</p>
                    </div>
                ) : filteredChatRooms.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-gray-400 text-lg">No chats found</p>
                    </div>
                ) : (
                    <>
                        {filteredChatRooms.map((item, index) => {
                            try {
                                if (!item) return null;

                                return (
                                    <div
                                        key={item.id || item.chatRoomId?.toString() || `chat-${index}`}
                                        className="flex items-center px-5 py-3 transition-all border-b border-white/10 last:border-b-0 rounded-2xl hover:bg-white/5"
                                    >
                                        {/* Main chat content - clickable */}
                                        <div
                                            onClick={() => handleChatClick(item)}
                                            className="flex items-center flex-1 cursor-pointer"
                                        >
                                            <div className="w-12 h-12 mr-4 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_16px_24px_rgba(0,0,0,0.97),0_0_0_1px_rgba(255,255,255,0.16),inset_0_3px_4px_rgba(255,255,255,0.24),inset_0_-4px_7px_rgba(0,0,0,0.96),inset_3px_0_4px_rgba(255,255,255,0.18),inset_-3px_0_4px_rgba(0,0,0,0.82)] border border-black/70 flex items-center justify-center flex-shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#181818] to-[#050505] shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-3px_5px_rgba(0,0,0,0.95)] flex items-center justify-center overflow-hidden">
                                                    {item.avatar ? (
                                                        <img
                                                            src={item.avatar}
                                                            alt={item.name || 'User'}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.parentElement.innerHTML = `<span class="text-xs font-semibold text-white">${item.initials || 'U'}</span>`;
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="text-xs font-semibold text-white">
                                                            {item.initials}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h3 className="text-white font-semibold text-base">
                                                        {item.name || 'Unknown User'}
                                                    </h3>
                                                    <span className="text-white text-[11px] sm:text-xs whitespace-nowrap">
                                                        {item.time ? item.time : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center flex-1 mr-2 overflow-hidden">
                                                        {item.previewType === 'image' && (
                                                            <IoImages className="text-gray-400 text-sm mr-1.5 flex-shrink-0" />
                                                        )}
                                                        {item.previewType === 'video' && (
                                                            <IoPlayCircle className="text-gray-400 text-sm mr-1.5 flex-shrink-0" />
                                                        )}
                                                        {item.previewType === 'document' && (
                                                            <IoDocumentText className="text-gray-400 text-sm mr-1.5 flex-shrink-0" />
                                                        )}
                                                        {item.previewType === 'audio' && (
                                                            <IoMic className="text-gray-400 text-sm mr-1.5 flex-shrink-0" />
                                                        )}
                                                        <p className="text-gray-400 text-sm truncate">
                                                            {item.message || 'No messages yet'}
                                                        </p>
                                                    </div>
                                                    {item.unreadCount > 0 && (
                                                        <div className="flex items-center justify-center flex-shrink-0">
                                                            {/* Outer neumorphic ring, matching header/add-friend theme */}
                                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_8px_12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.18),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70">
                                                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                                                                    <span className="text-white text-[10px] sm:text-xs font-bold">
                                                                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delete button - always visible */}
                                        <button
                                            onClick={(e) => handleDeleteChat(item, e)}
                                            className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all flex-shrink-0"
                                            title="Delete chat"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            } catch (error) {
                                console.error('Error rendering chat item:', error, 'Item:', item);
                                return (
                                    <div
                                        key={`error-${index}`}
                                        className="flex items-center px-5 py-4"
                                    >
                                        <p className="text-white">Error loading chat</p>
                                    </div>
                                );
                            }
                        })}
                        {isLoadingMore && hasMore && (
                            <div className="flex items-center justify-center py-3">
                                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Bottom Navigation - glass / 3D neumorphic (same base as back button, with glassy background) */}
            <div className="flex items-center justify-around px-6 py-3 mx-4 mb-4 rounded-[28px] bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding">
                {/* Chats (active) */}
                <button className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 animate-pulse">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoChatbubbles className="text-white text-3xl" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/camera')}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 animate-pulse hover:bg-[#1d1d1d] transition-colors">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoCamera className="text-white text-3xl" />
                    </div>
                </button>

                {/* Placeholder middle icon */}
                <button
                    onClick={() => navigate('/call-history')}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoCall className="text-gray-300 text-2xl" />
                    </div>
                </button>

                {/* Friends / Requests entry from Chats - go directly to Requests page */}
                <button
                    onClick={() => navigate('/requests')}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors"
                >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoPeopleOutline className="text-gray-300 text-2xl" />
                    </div>
                </button>

            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteDialog && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.9)]">
                        <div className="text-center">
                            {/* Warning Icon */}
                            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-500/20 mb-4 border border-red-500/30">
                                <svg className="h-7 w-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>

                            <h3 className="text-xl font-semibold text-white mb-2">
                                Delete Chat
                            </h3>

                            <p className="text-gray-300 mb-6 text-sm">
                                Are you sure you want to delete this chat with{' '}
                                <span className="font-semibold text-white">
                                    {chatToDelete?.name || 'Unknown User'}
                                </span>
                                ? This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={cancelDeleteChat}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] text-white rounded-xl border border-white/10 hover:from-[#333] hover:to-[#222] transition-all disabled:opacity-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDeleteChat}
                                    disabled={deleting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-b from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-medium shadow-[0_4px_12px_rgba(220,38,38,0.4)]"
                                >
                                    {deleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        'Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
