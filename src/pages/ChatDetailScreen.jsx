import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    IoArrowBack,
    IoVideocam,
    IoCall,
    IoHappyOutline,
    IoAttach,
    IoCamera,
    IoSend,
    IoArrowDown,
    IoShieldCheckmark,
    IoLockClosed,
    IoCheckmarkDone,
    IoCheckmark,
    IoCreateOutline,
    IoTrashOutline,
    IoCloseCircle,
    IoCheckmarkCircle,
    IoEllipsisVertical,
} from 'react-icons/io5';
import { ApiUtils } from '../services/AuthService';
import chatApiService from '../services/ChatApiService';
import EncryptionService from '../services/EncryptionService';
import { useWebSocket, useUserOnlineStatus } from '../contexts/WebSocketContext';

// Typing Indicator Component
const TypingIndicator = () => {
    return (
        <div className="flex items-start my-2 ml-5">
            <div className="bg-[#2d2d2d] border border-gray-700 rounded-2xl px-4 py-3 shadow-lg">
                <p className="text-gray-400 text-sm italic animate-pulse">typing...</p>
            </div>
        </div>
    );
};

export default function ChatDetailScreen() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();

    const name = searchParams.get('name') || 'Unknown';
    const avatar = searchParams.get('avatar') || '';
    const receiverId = searchParams.get('receiverId') || '';

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState([]);
    const [showNewMessageNotification, setShowNewMessageNotification] = useState(false);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Edit/Delete message states
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingMessageText, setEditingMessageText] = useState('');
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showMessageMenu, setShowMessageMenu] = useState(false);

    const receiverUserId = parseInt(receiverId);

    // Use the global online status hook
    const isReceiverOnline = useUserOnlineStatus(receiverUserId);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const textInputRef = useRef(null);
    const lastMessageCountRef = useRef(0);
    const typingTimeoutRef = useRef(null);
    const markedAsReadRef = useRef(new Set()); // Track which messages have been marked as read

    const chatRoomId = parseInt(id);

    // Get WebSocket context
    const {
        connected,
        connecting,
        error: wsError,
        sendMessage: sendSocketMessage,
        messages: socketMessages,
        sendTypingIndicator,
        subscribeToChat,
        subscribe,
        unsubscribe,
    } = useWebSocket();

    console.log('=== CHAT DETAIL SCREEN ===');
    console.log('Chat Room ID:', chatRoomId);
    console.log('Receiver ID:', receiverUserId);
    console.log('WebSocket Connected:', connected);
    console.log('WebSocket Connecting:', connecting);
    console.log('WebSocket Error:', wsError);

    // Get current user ID
    useEffect(() => {
        const getUserId = async () => {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);
            console.log('Current User ID:', userId);
        };
        getUserId();
    }, []);

    // Close message menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMessageMenu && !event.target.closest('.message-menu')) {
                setShowMessageMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMessageMenu]);

    // Mark messages as read when they appear (only once per message)
    useEffect(() => {
        if (!connected || !currentUserId) return;

        messages.forEach((item) => {
            // Only mark unread messages from other users that haven't been marked yet
            if (!item.isMe && !item.isRead && item.id && !item.id.toString().startsWith('temp-') && !markedAsReadRef.current.has(item.id)) {
                markedAsReadRef.current.add(item.id);
                markMessageAsRead(item.id);
            }
        });
    }, [messages, connected, currentUserId]);

    // Load encryption state
    useEffect(() => {
        const loadEncryptionState = async () => {
            try {
                const decryptedBackendData = localStorage.getItem('decryptedBackendData');
                if (decryptedBackendData) {
                    setIsEncryptionEnabled(true);
                    console.log('✅ Encryption ENABLED');
                }
            } catch (error) {
                console.error('Error loading encryption state:', error);
            }
        };
        loadEncryptionState();
    }, [chatRoomId]);

    // Load chat messages
    useEffect(() => {
        if (currentUserId && chatRoomId) {
            loadChatMessages();
        }
    }, [currentUserId, chatRoomId]);

    // Subscribe to WebSocket messages
    useEffect(() => {
        if (!connected || !currentUserId || !chatRoomId) {
            console.log('⚠️ Not ready for WebSocket subscription');
            return;
        }

        console.log('📡 Subscribing to chat room:', chatRoomId);

        // Subscribe to messages we send (as sender)
        const senderDestination = `/topic/chat/${chatRoomId}/${currentUserId}/${receiverUserId}`;
        console.log('Subscribing to sender destination:', senderDestination);

        // Subscribe to messages we receive (as receiver)
        const receiverDestination = `/topic/chat/${chatRoomId}/${receiverUserId}/${currentUserId}`;
        console.log('Subscribing to receiver destination:', receiverDestination);

        const handleMessage = (wsMessage) => {
            console.log('📨 WebSocket message received');
            console.log('📨 Message data:', JSON.stringify(wsMessage, null, 2));

            // Skip typing indicators
            if (wsMessage.typing !== undefined || wsMessage.messageType === 'TYPING') {
                return;
            }

            // Add new message to state
            const newMsg = {
                id: wsMessage.chatMessageId || wsMessage.id || `ws-${Date.now()}`,
                text: wsMessage.content || wsMessage.message || '',
                time: formatMessageTime(wsMessage.timestamp || wsMessage.sentAt),
                isMe: wsMessage.senderId === currentUserId,
                status: 'delivered',
                timestamp: wsMessage.timestamp || wsMessage.sentAt || new Date().toISOString(),
                senderName: wsMessage.senderName || (wsMessage.senderId === currentUserId ? 'You' : name),
                senderId: wsMessage.senderId,
                receiverId: wsMessage.receiverId,
                isEncrypted: false,
            };

            setMessages((prev) => {
                // Check for duplicates by real ID
                const existsById = prev.some((m) => m.id === newMsg.id && !m.id.toString().startsWith('temp-') && !m.id.toString().includes(`${currentUserId}-`));
                if (existsById) {
                    console.log('⚠️ Message already exists with real ID:', newMsg.id);
                    return prev;
                }

                // If this is from current user, replace the temporary/pseudo message
                if (newMsg.isMe) {
                    // Find and replace temp or pseudo ID message with matching content
                    const tempIndex = prev.findIndex((m) => {
                        const isTempOrPseudo = m.id.toString().startsWith('temp-') || m.id.toString().includes(`${currentUserId}-`);
                        return isTempOrPseudo && m.isMe && m.text === newMsg.text;
                    });

                    if (tempIndex !== -1) {
                        console.log('✅ Replacing temp/pseudo message with real ID:', prev[tempIndex].id, '→', newMsg.id);
                        const updated = [...prev];
                        updated[tempIndex] = { ...newMsg, status: 'sent' };
                        return updated;
                    } else {
                        console.log('⚠️ No matching temp message found for:', newMsg.text.substring(0, 20));
                    }
                }

                // Otherwise add as new message
                console.log('➕ Adding new message:', newMsg.id);
                return [...prev, newMsg];
            });

            // Auto scroll if not scrolled up
            if (!isUserScrolledUp) {
                setTimeout(() => scrollToBottom(), 100);
            } else {
                setNewMessageCount((prev) => prev + 1);
                setShowNewMessageNotification(true);
            }
        };

        // Subscribe to both sender and receiver destinations
        const senderSubscription = subscribe(senderDestination, handleMessage);
        const receiverSubscription = subscribe(receiverDestination, handleMessage);

        // Subscribe to typing indicators
        const typingDestination = `/topic/chat/${chatRoomId}/typing/${currentUserId}`;
        console.log('Subscribing to typing:', typingDestination);

        const typingTimeouts = new Map();

        const typingSubscription = subscribe(typingDestination, (typingMsg) => {
            console.log('⌨️ Typing indicator received:', typingMsg);

            const senderId = typingMsg.senderId || receiverUserId;

            if (typingMsg.typing) {
                // Clear existing timeout for this user
                if (typingTimeouts.has(senderId)) {
                    clearTimeout(typingTimeouts.get(senderId));
                }

                // Add user to typing list
                setTypingUsers((prev) => {
                    if (!prev.includes(senderId)) {
                        return [...prev, senderId];
                    }
                    return prev;
                });

                // Auto-clear after 1.5 seconds
                const timeout = setTimeout(() => {
                    setTypingUsers((prev) => prev.filter((id) => id !== senderId));
                    typingTimeouts.delete(senderId);
                }, 1000);

                typingTimeouts.set(senderId, timeout);
            } else {
                // Clear timeout and remove from typing list
                if (typingTimeouts.has(senderId)) {
                    clearTimeout(typingTimeouts.get(senderId));
                    typingTimeouts.delete(senderId);
                }
                setTypingUsers((prev) => prev.filter((id) => id !== senderId));
            }
        });

        // Subscribe to edit messages - both as sender and receiver
        const editSenderDestination = `/topic/chat/edit/${chatRoomId}/${currentUserId}/${receiverUserId}`;
        const editReceiverDestination = `/topic/chat/edit/${chatRoomId}/${receiverUserId}/${currentUserId}`;
        console.log('Subscribing to edit sender:', editSenderDestination);
        console.log('Subscribing to edit receiver:', editReceiverDestination);

        const handleEditMessage = (editMsg) => {
            console.log('✏️ Edit message received:', JSON.stringify(editMsg, null, 2));

            const messageData = editMsg.data || editMsg;
            const editedMessageId = messageData.chatMessageId;

            console.log('📝 Parsed edit data:', {
                editedMessageId,
                content: messageData.content,
                fullData: messageData
            });

            setMessages((prev) => {
                console.log('📋 Current messages count:', prev.length);
                const updated = prev.map((msg) => {
                    if (msg.id == editedMessageId || msg.id === editedMessageId.toString()) {
                        console.log('✅ Found matching message to edit:', msg.id, '→', messageData.content);
                        return {
                            ...msg,
                            text: messageData.content || msg.text,
                            isEdited: true,
                            editedAt: messageData.editedAt || new Date().toISOString(),
                        };
                    }
                    return msg;
                });

                const wasUpdated = updated.some((m, i) => m !== prev[i]);
                console.log('📊 Was any message updated?', wasUpdated);

                return updated;
            });
        };

        const editSenderSubscription = subscribe(editSenderDestination, handleEditMessage);
        const editReceiverSubscription = subscribe(editReceiverDestination, handleEditMessage);

        // Subscribe to delete messages
        const deleteDestination = `/topic/chat/${chatRoomId}/delete`;
        const deleteSubscription = subscribe(deleteDestination, (deleteMsg) => {
            console.log('🗑️ Delete message received:', deleteMsg);

            const messageData = deleteMsg.data || deleteMsg;
            const deletedMessageId = messageData.chatMessageId;

            setMessages((prev) => prev.map((msg) => {
                if (msg.id == deletedMessageId || msg.id === deletedMessageId.toString()) {
                    console.log('✅ Message deleted:', msg.id);
                    return {
                        ...msg,
                        text: null,
                        isDeleted: true,
                        deletedAt: messageData.deletedAt || new Date().toISOString(),
                    };
                }
                return msg;
            }));
        });

        // Subscribe to read receipts - both as sender and receiver
        const readSenderDestination = `/topic/chat/read/${chatRoomId}/${currentUserId}/${receiverUserId}`;
        const readReceiverDestination = `/topic/chat/read/${chatRoomId}/${receiverUserId}/${currentUserId}`;
        console.log('Subscribing to read sender:', readSenderDestination);
        console.log('Subscribing to read receiver:', readReceiverDestination);

        const handleReadReceipt = (readMsg) => {
            console.log('✅ Read receipt received:', JSON.stringify(readMsg, null, 2));

            const messageData = readMsg.data || readMsg;
            const readMessageId = messageData.chatMessageId || messageData.messageId;

            console.log('📖 Processing read receipt for message ID:', readMessageId);

            setMessages((prev) => {
                const updated = prev.map((msg) => {
                    if (msg.id == readMessageId || msg.id === readMessageId.toString()) {
                        console.log('✅ Found message to mark as read:', msg.id, 'Current status:', msg.status);
                        return {
                            ...msg,
                            isRead: true,
                            readAt: messageData.readAt || new Date().toISOString(),
                            status: 'read',
                        };
                    }
                    return msg;
                });

                const wasUpdated = updated.some((m, i) => m.status !== prev[i].status);
                console.log('📊 Was any message status updated?', wasUpdated);

                return updated;
            });
        };

        const readSenderSubscription = subscribe(readSenderDestination, handleReadReceipt);
        const readReceiverSubscription = subscribe(readReceiverDestination, handleReadReceipt);

        return () => {
            console.log('🧹 Unsubscribing from chat');
            if (senderSubscription) unsubscribe(senderDestination);
            if (receiverSubscription) unsubscribe(receiverDestination);
            if (typingSubscription) unsubscribe(typingDestination);
            if (editSenderSubscription) unsubscribe(editSenderDestination);
            if (editReceiverSubscription) unsubscribe(editReceiverDestination);
            if (deleteSubscription) unsubscribe(deleteDestination);
            if (readSenderSubscription) unsubscribe(readSenderDestination);
            if (readReceiverSubscription) unsubscribe(readReceiverDestination);
        };
    }, [connected, currentUserId, chatRoomId, receiverUserId, subscribe, unsubscribe, isUserScrolledUp]);

    const loadChatMessages = async () => {
        try {
            setLoading(true);
            console.log('📥 Loading messages from API...');

            const response = await chatApiService.getChatRoomMessages(chatRoomId, currentUserId, {
                pageNumber: 1,
                size: 1000,
                sortBy: 'sentAt',
            });

            console.log('API Response:', response);

            const transformedMessages = (response.data || []).map((msg, index) => ({
                id: msg.chatMessageId?.toString() || msg.messageId?.toString() || `msg-${index}`,
                text: msg.content || msg.message || null,
                time: msg.sentAt ? formatMessageTime(msg.sentAt) : '12:00 AM',
                isMe: msg.senderId === currentUserId,
                status: msg.isRead ? 'read' : (msg.status || 'delivered'),
                timestamp: msg.sentAt || new Date().toISOString(),
                senderName: msg.senderName || (msg.senderId === currentUserId ? 'You' : name),
                senderId: msg.senderId,
                receiverId: msg.receiverId,
                isEncrypted: false,
                isRead: msg.isRead || false,
                readAt: msg.readAt || null,
                isDeleted: msg.content === null || msg.isDeleted === true,
                deletedAt: msg.deletedAt || (msg.content === null ? msg.sentAt : null),
            }));

            setMessages(transformedMessages);
            lastMessageCountRef.current = transformedMessages.length;
            console.log('✅ Loaded', transformedMessages.length, 'messages');

            // Auto scroll to bottom
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error('❌ Error loading messages:', error);
            setMessages([]);
        } finally {
            setLoading(false);
        }
    };

    const formatMessageTime = (timestamp) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        } catch (error) {
            return '12:00 AM';
        }
    };

    const sendMessage = async () => {
        if (!message.trim()) return;

        // Check if we're editing a message
        if (editingMessageId) {
            handleEditMessage();
            return;
        }

        console.log('📤 Sending message:', message);

        try {
            if (!currentUserId || !chatRoomId || !receiverUserId) {
                alert('Missing required information');
                return;
            }

            const newMessage = {
                id: `temp-${Date.now()}`,
                text: message.trim(),
                time: new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                }),
                isMe: true,
                status: 'sending',
                timestamp: new Date().toISOString(),
                senderName: 'You',
                senderId: currentUserId,
                receiverId: receiverUserId,
            };

            // Add to UI immediately
            setMessages((prev) => [...prev, newMessage]);
            setMessage('');

            // Send via WebSocket
            if (connected && sendSocketMessage) {
                console.log('Sending via WebSocket...');
                const success = sendSocketMessage(chatRoomId, currentUserId, receiverUserId, {
                    content: newMessage.text,
                    messageType: 'TEXT',
                });

                if (success) {
                    console.log('✅ Message sent via WebSocket');

                    // Generate a pseudo-real ID (timestamp-based) to replace temp ID
                    // This allows the three-dot menu to appear immediately
                    const pseudoId = `${currentUserId}-${Date.now()}`;

                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === newMessage.id
                                ? { ...msg, id: pseudoId, status: 'sent' }
                                : msg
                        )
                    );
                } else {
                    console.log('❌ WebSocket send failed');
                    setMessages((prev) =>
                        prev.map((msg) => (msg.id === newMessage.id ? { ...msg, status: 'failed' } : msg))
                    );
                }
            } else {
                console.log('⚠️ WebSocket not connected');
                alert('WebSocket not connected. Please wait and try again.');
            }

            // Auto scroll
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error('❌ Error sending message:', error);
            alert('Failed to send message');
        }
    };

    // Mark message as read
    const markMessageAsRead = (messageId) => {
        if (!connected || !currentUserId || !chatRoomId || !receiverUserId) return;

        console.log('📖 Marking message as read:', messageId);

        // Backend expects: /chat/read/{chatRoomId}/{senderId}/{receiverId}
        // Where senderId is the one who SENT the message (receiverUserId in our context)
        // And receiverId is the one READING the message (currentUserId)
        const destination = `/app/chat/read/${chatRoomId}/${receiverUserId}/${currentUserId}`;
        const success = publish(destination, {
            chatMessageId: messageId,
            messageId: messageId,
        });

        if (success) {
            console.log('✅ Read receipt sent for message:', messageId, 'to destination:', destination);
        } else {
            console.error('❌ Failed to send read receipt for message:', messageId);
        }
    };

    // Delete message
    const handleDeleteMessage = (messageId) => {
        if (!messageId || !currentUserId || !chatRoomId) return;

        if (!confirm('Are you sure you want to delete this message?')) return;

        console.log('🗑️ Deleting message:', messageId);

        const destination = `/app/chat/delete/${chatRoomId}/${messageId}/${currentUserId}`;
        const success = publish(destination, {});

        if (success) {
            console.log('✅ Delete message sent');
            setShowMessageMenu(null);
            setSelectedMessage(null);
        } else {
            alert('Failed to delete message');
        }
    };

    // Start editing a message
    const startEditMessage = (msg) => {
        setEditingMessageId(msg.id);
        setEditingMessageText(msg.text);
        setMessage(msg.text); // Set the input box text
        setShowMessageMenu(null);
        // Focus the input
        setTimeout(() => textInputRef.current?.focus(), 100);
    };

    // Handle editing a message
    const handleEditMessage = () => {
        if (!message.trim() || !editingMessageId) return;

        console.log('✏️ Editing message:', editingMessageId, '→', message);

        // Send edit via WebSocket
        if (connected && publish) {
            const destination = `/app/chat/edit/${chatRoomId}/${editingMessageId}/${currentUserId}/${receiverUserId}`;
            const payload = {
                content: message.trim(),
                messageType: 'TEXT',
            };

            console.log('📤 Sending edit:', {
                destination,
                payload,
                chatRoomId,
                messageId: editingMessageId,
                senderId: currentUserId,
                receiverId: receiverUserId
            });

            const success = publish(destination, payload);

            if (success) {
                console.log('✅ Edit sent via WebSocket successfully');

                // Optimistically update the message locally
                setMessages((prev) => prev.map((msg) => {
                    if (msg.id == editingMessageId || msg.id === editingMessageId.toString()) {
                        return {
                            ...msg,
                            text: message.trim(),
                            isEdited: true,
                            editedAt: new Date().toISOString(),
                        };
                    }
                    return msg;
                }));
            } else {
                alert('Failed to edit message');
            }
        }

        // Clear editing state
        setEditingMessageId(null);
        setEditingMessageText('');
        setMessage('');
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditingMessageText('');
        setMessage('');
    };

    // Get publish function from WebSocket
    const { publish } = useWebSocket();

    const handleTextChange = (text) => {
        setMessage(text);

        // Send typing indicator
        if (connected && sendTypingIndicator && currentUserId && chatRoomId && receiverUserId) {
            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            if (text.trim()) {
                // User is typing - send typing indicator
                sendTypingIndicator(chatRoomId, currentUserId, receiverUserId, true);

                // Stop typing after 1.5 seconds of no input
                typingTimeoutRef.current = setTimeout(() => {
                    sendTypingIndicator(chatRoomId, currentUserId, receiverUserId, false);
                }, 1500);
            } else {
                // Text is empty - stop typing immediately
                sendTypingIndicator(chatRoomId, currentUserId, receiverUserId, false);
            }
        }
    };

    const handleCallPress = (isVideo) => {
        if (!connected) {
            alert('WebSocket not connected. Please wait and try again.');
            return;
        }

        navigate(
            `/call/outgoing?receiverId=${receiverUserId}&receiverName=${encodeURIComponent(
                name
            )}&receiverAvatar=${encodeURIComponent(avatar)}&isVideoCall=${isVideo}`
        );
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            setShowNewMessageNotification(false);
            setNewMessageCount(0);
        }
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        setIsUserScrolledUp(!isNearBottom);

        if (isNearBottom && showNewMessageNotification) {
            setShowNewMessageNotification(false);
            setNewMessageCount(0);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="h-screen bg-[#1a1a1a] flex flex-col overflow-hidden">
            {/* Header - Sticky Top */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 bg-[#1a1a1a] border-b border-gray-800 shadow-lg">
                <div className="flex items-center flex-1 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 sm:w-10 sm:h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center shadow-lg border border-gray-700 mr-2 sm:mr-4 hover:bg-gray-700 transition-colors flex-shrink-0"
                    >
                        <IoArrowBack className="text-white text-lg sm:text-xl" />
                    </button>
                    <img
                        src={decodeURIComponent(avatar || '')}
                        alt={name}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-4 shadow-lg flex-shrink-0"
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/40';
                        }}
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-white font-bold text-base sm:text-lg truncate">{name || 'Unknown'}</h2>
                        <p className="text-xs sm:text-sm truncate flex items-center">
                            {typingUsers.length > 0 ? (
                                <span className="text-blue-400 italic">Typing...</span>
                            ) : isReceiverOnline ? (
                                <>
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                    <span className="text-green-400">Online</span>
                                </>
                            ) : (
                                <>
                                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                                    <span className="text-red-400">Offline</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                        onClick={() => handleCallPress(true)}
                        className="w-9 h-9 sm:w-10 sm:h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
                    >
                        <IoVideocam className="text-white text-lg sm:text-xl" />
                    </button>
                    <button
                        onClick={() => handleCallPress(false)}
                        className="w-9 h-9 sm:w-10 sm:h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                        <IoCall className="text-white text-lg sm:text-xl" />
                    </button>
                </div>
            </div>

            {/* Date Separator */}
            <div className="flex flex-col items-center py-3 sm:py-4 bg-[#1a1a1a]">
                <p className="text-gray-400 text-xs sm:text-sm">Today</p>
                {isEncryptionEnabled && (
                    <div className="flex items-center mt-2 px-2 sm:px-3 py-1 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-full">
                        <IoShieldCheckmark className="text-green-400 text-xs sm:text-sm mr-1" />
                        <span className="text-green-400 text-xs font-medium">End-to-End Encrypted</span>
                    </div>
                )}
            </div>

            {/* Messages - Scrollable Area */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 sm:px-5 pb-3 sm:pb-5 scrollbar-hide">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-gray-400 text-lg">Loading messages...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-gray-400 text-lg">No messages yet</p>
                    </div>
                ) : (
                    messages.map((item) => {
                        return (
                            <div key={item.id} className={`flex my-1 sm:my-2 ${item.isMe ? 'justify-end' : 'justify-start'} group w-full`}>
                                <div className="relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%]">
                                    <div
                                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-lg ${item.isDeleted
                                            ? 'bg-gray-800 border border-gray-700'
                                            : item.isMe
                                                ? 'bg-red-500'
                                                : 'bg-[#2d2d2d] border border-gray-700'
                                            }`}
                                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                                        onContextMenu={(e) => {
                                            if (item.isMe && !item.isDeleted) {
                                                e.preventDefault();
                                                setSelectedMessage(item);
                                                setShowMessageMenu(true);
                                            }
                                        }}
                                    >
                                        {/* Message Content */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                {item.isDeleted ? (
                                                    <div className="flex flex-col">
                                                        <p className="text-sm sm:text-base italic text-gray-500 flex items-center">
                                                            <IoTrashOutline className="inline mr-2" />
                                                            This message was deleted
                                                        </p>
                                                        {item.deletedAt && (
                                                            <p className="text-xs text-gray-600 mt-1">
                                                                Deleted at {formatMessageTime(item.deletedAt)}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${item.isMe ? 'text-white' : 'text-white'}`}
                                                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                        {item.text}
                                                    </p>
                                                )}
                                                {item.isEncrypted && !item.isDeleted && (
                                                    <IoLockClosed className={`ml-2 mt-1 text-xs flex-shrink-0 ${item.isMe ? 'text-white opacity-70' : 'text-gray-400'}`} />
                                                )}
                                            </div>

                                            {/* Three-dot menu for own messages (show for all sent messages) */}
                                            {item.isMe && !item.isDeleted && !item.id.toString().startsWith('temp-') && (
                                                <div className="ml-2 flex-shrink-0 relative message-menu">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowMessageMenu(showMessageMenu === item.id ? null : item.id);
                                                        }}
                                                        className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-opacity"
                                                        title="Options"
                                                    >
                                                        <IoEllipsisVertical className="text-white text-base" />
                                                    </button>

                                                    {/* Dropdown menu */}
                                                    {showMessageMenu === item.id && (
                                                        <div className="absolute right-0 top-8 bg-[#2d2d2d] border border-gray-700 rounded-lg shadow-xl z-50 min-w-[120px]">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    console.log('Edit clicked for message:', item.id);
                                                                    startEditMessage(item);
                                                                    setShowMessageMenu(null);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2 rounded-t-lg"
                                                            >
                                                                <IoCreateOutline className="text-base" />
                                                                <span className="text-sm">Edit</span>
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    console.log('Delete clicked for message:', item.id);
                                                                    handleDeleteMessage(item.id);
                                                                    setShowMessageMenu(null);
                                                                }}
                                                                className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center gap-2 rounded-b-lg"
                                                                title="Delete"
                                                            >
                                                                <IoTrashOutline className="text-base" />
                                                                <span className="text-sm">Delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Time and Status */}
                                        <div className="flex items-center justify-between mt-1.5">
                                            <div className="flex items-center gap-1">
                                                <p className={`text-xs ${item.isMe ? 'text-white opacity-70' : 'text-gray-400'}`}>
                                                    {item.time}
                                                </p>
                                                {item.isEdited && !item.isDeleted && (
                                                    <span className={`text-xs italic ${item.isMe ? 'text-white opacity-60' : 'text-gray-500'}`}>
                                                        (edited)
                                                    </span>
                                                )}
                                            </div>

                                            {/* Read receipts for sent messages */}
                                            {item.isMe && !item.isDeleted && (
                                                <div className="ml-2 flex items-center">
                                                    {item.isRead || item.status === 'read' ? (
                                                        // Double tick - Blue (Read by receiver)
                                                        <IoCheckmarkDone className="text-blue-500 text-base" title="Read" />
                                                    ) : item.status === 'sending' ? (
                                                        // Single tick - Gray (Sending)
                                                        <IoCheckmark className="text-gray-300 text-base animate-pulse" title="Sending" />
                                                    ) : (
                                                        // Single tick - Gray (Sent but not read)
                                                        <IoCheckmark className="text-gray-300 text-base" title="Sent" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {typingUsers.length > 0 && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {/* New Message Notification */}
            {
                showNewMessageNotification && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-24 sm:bottom-28 left-3 right-3 sm:left-5 sm:right-5 bg-red-500 rounded-full py-2 sm:py-3 px-3 sm:px-4 shadow-lg flex items-center justify-center z-50 hover:bg-red-600 transition-colors"
                    >
                        <IoArrowDown className="text-white text-sm sm:text-base mr-2" />
                        <span className="text-white text-xs sm:text-sm font-semibold">
                            {newMessageCount} new message{newMessageCount > 1 ? 's' : ''}
                        </span>
                    </button>
                )
            }

            {/* Message Input - Sticky Bottom */}
            <div className="sticky bottom-0 z-10 bg-[#1a1a1a] px-3 sm:px-5 py-3 sm:py-4 border-t border-gray-800 shadow-lg">
                {/* Edit Mode Indicator */}
                {editingMessageId && (
                    <div className="mb-2 flex items-center justify-between bg-[#2d2d2d] px-3 py-2 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2">
                            <IoCreateOutline className="text-blue-400 text-lg" />
                            <span className="text-sm text-gray-300">Editing message</span>
                        </div>
                        <button
                            onClick={cancelEdit}
                            className="p-1 hover:bg-gray-700 rounded"
                        >
                            <IoCloseCircle className="text-gray-400 text-xl" />
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-1 sm:gap-2">
                    <button className="w-9 h-9 sm:w-10 sm:h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors flex-shrink-0">
                        <IoHappyOutline className="text-gray-400 text-lg sm:text-xl" />
                    </button>

                    <textarea
                        ref={textInputRef}
                        value={message}
                        onChange={(e) => handleTextChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={editingMessageId ? "Edit your message" : "Type a message"}
                        className="flex-1 bg-[#2d2d2d] border border-gray-700 rounded-3xl px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-gray-500 outline-none resize-none shadow-lg max-h-24 min-h-[40px] sm:min-h-[44px]"
                        rows={1}
                    />

                    {!editingMessageId && (
                        <>
                            <button className="hidden sm:flex w-10 h-10 bg-[#2d2d2d] rounded-full items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors flex-shrink-0">
                                <IoAttach className="text-gray-400 text-xl" />
                            </button>

                            <button className="hidden sm:flex w-10 h-10 bg-[#2d2d2d] rounded-full items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors flex-shrink-0">
                                <IoCamera className="text-white text-xl" />
                            </button>
                        </>
                    )}

                    <button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg transition-colors flex-shrink-0 ${message.trim()
                            ? 'bg-red-500 hover:bg-red-600'
                            : 'bg-gray-600 cursor-not-allowed'
                            }`}
                    >
                        {editingMessageId ? (
                            <IoCheckmarkCircle className="text-white text-lg sm:text-xl" />
                        ) : (
                            <IoSend className="text-white text-lg sm:text-xl" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
