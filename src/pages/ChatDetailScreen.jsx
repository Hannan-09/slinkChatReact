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
    IoArrowUndoOutline,
    IoCopyOutline,
} from 'react-icons/io5';
import EmojiPicker from 'emoji-picker-react';
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

    // Reply message states
    const [replyingToMessage, setReplyingToMessage] = useState(null);

    // Emoji picker state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Camera states
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

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
    // Get current user ID
    useEffect(() => {
        const getUserId = async () => {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);
        };
        getUserId();
    }, []);

    // Close message menu and emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMessageMenu && !event.target.closest('.message-menu')) {
                setShowMessageMenu(null);
            }
            if (showEmojiPicker && !event.target.closest('.emoji-picker-container')) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMessageMenu, showEmojiPicker]);

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
            return;
        }
        // Subscribe to messages we send (as sender)
        const senderDestination = `/topic/chat/${chatRoomId}/${currentUserId}/${receiverUserId}`;
        // Subscribe to messages we receive (as receiver)
        const receiverDestination = `/topic/chat/${chatRoomId}/${receiverUserId}/${currentUserId}`;
        const handleMessage = (wsMessage) => {
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
                isEdited: wsMessage.isEdited || false,
                editedAt: wsMessage.editedAt || null,
                replyTo: wsMessage.replyTo || null,
            };

            if (wsMessage.replyTo) {
            }

            // Check if message is from another user
            const isNewMessageFromOthers = !newMsg.isMe;

            setMessages((prev) => {
                // Check for duplicates by real ID
                const existsById = prev.some((m) => m.id === newMsg.id && !m.id.toString().startsWith('temp-') && !m.id.toString().includes(`${currentUserId}-`));
                if (existsById) {
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
                        const updated = [...prev];
                        const tempMessage = prev[tempIndex];
                        // Preserve replyTo from temp message if not in newMsg
                        updated[tempIndex] = {
                            ...newMsg,
                            status: 'sent',
                            replyTo: newMsg.replyTo || tempMessage.replyTo
                        };
                        return updated;
                    } else {
                        console.log('⚠️ No matching temp message found for:', newMsg.text.substring(0, 20));
                    }
                }

                // Otherwise add as new message
                return [...prev, newMsg];
            });

            // Show notification for NEW messages from OTHER users (only if actually added)
            if (isNewMessageFromOthers) {
                setNewMessageCount((prev) => {
                    const newCount = prev + 1;
                    return newCount;
                });
                setShowNewMessageNotification(true);
            }
        };

        // Subscribe to both sender and receiver destinations
        const senderSubscription = subscribe(senderDestination, handleMessage);
        const receiverSubscription = subscribe(receiverDestination, handleMessage);

        // Subscribe to typing indicators
        const typingDestination = `/topic/chat/${chatRoomId}/typing/${currentUserId}`;
        const typingTimeouts = new Map();

        const typingSubscription = subscribe(typingDestination, (typingMsg) => {
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
        const handleEditMessage = (editMsg) => {
            console.log('✏️ Edit message received:', JSON.stringify(editMsg, null, 2));

            const messageData = editMsg.data || editMsg;
            const editedMessageId = messageData.chatMessageId;
            setMessages((prev) => {
                const updated = prev.map((msg) => {
                    if (msg.id == editedMessageId || msg.id === editedMessageId.toString()) {
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
                return updated;
            });
        };

        const editSenderSubscription = subscribe(editSenderDestination, handleEditMessage);
        const editReceiverSubscription = subscribe(editReceiverDestination, handleEditMessage);

        // Subscribe to delete messages
        const deleteDestination = `/topic/chat/${chatRoomId}/delete`;
        const deleteSubscription = subscribe(deleteDestination, (deleteMsg) => {
            const messageData = deleteMsg.data || deleteMsg;
            const deletedMessageId = messageData.chatMessageId;

            setMessages((prev) => prev.map((msg) => {
                if (msg.id == deletedMessageId || msg.id === deletedMessageId.toString()) {
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
        const handleReadReceipt = (readMsg) => {
            console.log('✅ Read receipt received:', JSON.stringify(readMsg, null, 2));

            const messageData = readMsg.data || readMsg;
            const readMessageId = messageData.chatMessageId || messageData.messageId;
            setMessages((prev) => {
                const updated = prev.map((msg) => {
                    if (msg.id == readMessageId || msg.id === readMessageId.toString()) {
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
                return updated;
            });
        };

        const readSenderSubscription = subscribe(readSenderDestination, handleReadReceipt);
        const readReceiverSubscription = subscribe(readReceiverDestination, handleReadReceipt);

        return () => {
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
            const response = await chatApiService.getChatRoomMessages(chatRoomId, currentUserId, {
                pageNumber: 1,
                size: 1000,
                sortBy: 'sentAt',
            });
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
                isEdited: msg.isEdited || false,
                editedAt: msg.editedAt || null,
                isDeleted: msg.content === null || msg.isDeleted === true,
                deletedAt: msg.deletedAt || (msg.content === null ? msg.sentAt : null),
                replyTo: msg.replyTo || null,
            }));

            setMessages(transformedMessages);
            lastMessageCountRef.current = transformedMessages.length;
            // Auto scroll to bottom instantly (no animation on initial load)
            setTimeout(() => scrollToBottom(true), 100);
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

    const formatDateSeparator = (timestamp) => {
        try {
            const date = new Date(timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            // Reset time to compare only dates
            today.setHours(0, 0, 0, 0);
            yesterday.setHours(0, 0, 0, 0);
            const messageDate = new Date(date);
            messageDate.setHours(0, 0, 0, 0);

            if (messageDate.getTime() === today.getTime()) {
                return 'Today';
            } else if (messageDate.getTime() === yesterday.getTime()) {
                return 'Yesterday';
            } else {
                // Format as "27 October 2025" or day name if within last week
                const daysDiff = Math.floor((today - messageDate) / (1000 * 60 * 60 * 24));
                if (daysDiff < 7) {
                    return date.toLocaleDateString('en-US', { weekday: 'long' });
                } else {
                    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                }
            }
        } catch (error) {
            return '';
        }
    };

    const shouldShowDateSeparator = (currentMessage, previousMessage) => {
        if (!previousMessage) return true;

        const currentDate = new Date(currentMessage.timestamp);
        const previousDate = new Date(previousMessage.timestamp);

        currentDate.setHours(0, 0, 0, 0);
        previousDate.setHours(0, 0, 0, 0);

        return currentDate.getTime() !== previousDate.getTime();
    };

    const sendMessage = async () => {
        if (!message.trim()) return;

        // Check if we're editing a message
        if (editingMessageId) {
            handleEditMessage();
            return;
        }
        if (replyingToMessage) {
        }

        try {
            if (!currentUserId || !chatRoomId || !receiverUserId) {
                alert('Missing required information');
                return;
            }

            // Store replyTo data before clearing state
            const replyToData = replyingToMessage ? {
                chatMessageId: replyingToMessage.id,
                content: replyingToMessage.text,
                senderName: replyingToMessage.senderName,
            } : null;
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
                replyTo: replyToData,
            };

            // Add to UI immediately
            setMessages((prev) => [...prev, newMessage]);
            setMessage('');
            setReplyingToMessage(null); // Clear reply state

            // Send via WebSocket
            if (connected && sendSocketMessage) {
                // Build the payload matching ChatMessageRequest DTO
                const payload = {
                    content: newMessage.text,
                    messageType: 'TEXT',
                    replyToId: replyToData ? parseInt(replyToData.chatMessageId) : null,
                    attachments: [],
                };


                const success = sendSocketMessage(chatRoomId, currentUserId, receiverUserId, payload);

                if (success) {
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
                    setMessages((prev) =>
                        prev.map((msg) => (msg.id === newMessage.id ? { ...msg, status: 'failed' } : msg))
                    );
                }
            } else {
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
        // Backend expects: /chat/read/{chatRoomId}/{senderId}/{receiverId}
        // Where senderId is the one who SENT the message (receiverUserId in our context)
        // And receiverId is the one READING the message (currentUserId)
        const destination = `/app/chat/read/${chatRoomId}/${receiverUserId}/${currentUserId}`;
        const success = publish(destination, {
            chatMessageId: messageId,
            messageId: messageId,
        });

        if (success) {
        } else {
            console.error('❌ Failed to send read receipt for message:', messageId);
        }
    };

    // Delete message
    const handleDeleteMessage = (messageId) => {
        if (!messageId || !currentUserId || !chatRoomId) return;

        if (!confirm('Are you sure you want to delete this message?')) return;
        const destination = `/app/chat/delete/${chatRoomId}/${messageId}/${currentUserId}`;
        const success = publish(destination, {});

        if (success) {
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
        // Send edit via WebSocket
        if (connected && publish) {
            const destination = `/app/chat/edit/${chatRoomId}/${editingMessageId}/${currentUserId}/${receiverUserId}`;
            const payload = {
                content: message.trim(),
                messageType: 'TEXT',
            };
            const success = publish(destination, payload);

            if (success) {
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

    // Start replying to a message
    const startReplyMessage = (msg) => {
        setReplyingToMessage(msg);
        setShowMessageMenu(null);
        // Focus the input
        setTimeout(() => textInputRef.current?.focus(), 100);
    };

    // Cancel replying
    const cancelReply = () => {
        setReplyingToMessage(null);
    };

    // Copy message text
    const copyMessageText = (text) => {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                setShowMessageMenu(null);
                alert('Message copied!');
            }).catch((err) => {
                // Fallback to older method
                fallbackCopyText(text);
            });
        } else {
            // Fallback for older browsers or HTTP
            fallbackCopyText(text);
        }
    };

    // Fallback copy method for older browsers or HTTP
    const fallbackCopyText = (text) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            setShowMessageMenu(null);
            alert('Message copied!');
        } catch (err) {
            alert('Failed to copy message');
        }

        document.body.removeChild(textArea);
    };

    // Handle emoji selection
    const handleEmojiClick = (emojiData) => {
        setMessage((prev) => prev + emojiData.emoji);
        setShowEmojiPicker(false);
        // Focus back on input
        setTimeout(() => textInputRef.current?.focus(), 100);
    };

    // Open camera
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false,
            });
            setCameraStream(stream);
            setShowCamera(true);
            // Set video stream after state update
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please check permissions.');
        }
    };

    // Close camera
    const closeCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach((track) => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    // Capture photo
    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas to blob
            canvas.toBlob((blob) => {
                if (blob) {
                    // Create a file from blob
                    const file = new File([blob], `photo-${Date.now()}.jpg`, {
                        type: 'image/jpeg',
                    });

                    // TODO: Upload file and send as attachment
                    alert('Photo captured! (Upload functionality to be implemented)');

                    // Close camera
                    closeCamera();
                }
            }, 'image/jpeg', 0.95);
        }
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [cameraStream]);

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

    const scrollToBottom = (instant = false) => {
        console.log("instant", instant);
        const container = messagesContainerRef.current;
        if (!container) return;

        if (instant) {
            // Instant scroll - no animation
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'auto'
            });
        } else {
            // Smooth scroll - with animation
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }

        // Reset notification
        setShowNewMessageNotification(false);
        setNewMessageCount(0);
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
            {/* <div className="flex flex-col items-center py-3 sm:py-4 bg-[#1a1a1a]">
                <p className="text-gray-400 text-xs sm:text-sm">Today</p>
                {isEncryptionEnabled && (
                    <div className="flex items-center mt-2 px-2 sm:px-3 py-1 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-full">
                        <IoShieldCheckmark className="text-green-400 text-xs sm:text-sm mr-1" />
                        <span className="text-green-400 text-xs font-medium">End-to-End Encrypted</span>
                    </div>
                )}
            </div> */}

            {/* Messages - Scrollable Area */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 sm:px-5 pb-3 sm:pb-5 scrollbar-hide">                {loading ? (
                <div className="flex items-center justify-center py-12">
                    <p className="text-gray-400 text-lg">Loading messages...</p>
                </div>
            ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <p className="text-gray-400 text-lg">No messages yet</p>
                </div>
            ) : (
                <>
                    {messages.map((item, index) => {
                        const previousMessage = index > 0 ? messages[index - 1] : null;
                        const showDateSeparator = shouldShowDateSeparator(item, previousMessage);

                        return (
                            <>
                                {/* Date Separator - Sticky */}
                                {showDateSeparator && (
                                    <div key={`date-${item.id}`} className="sticky top-0 z-20 flex justify-center py-3 -mx-3 sm:-mx-5 px-3 sm:px-5 bg-[#1a1a1a]">

                                        <div className="bg-[#2d2d2d] px-3 py-1 rounded-lg shadow-lg border border-gray-700">

                                            <p className="text-gray-400 text-xs font-medium">

                                                {formatDateSeparator(item.timestamp)}

                                            </p>

                                        </div>

                                    </div>
                                )}

                                {/* Message */}
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
                                                    {/* Reply Preview */}
                                                    {item.replyTo && (
                                                        <div className={`mb-2 pl-2 border-l-2 ${item.isMe ? 'border-white border-opacity-50' : 'border-red-500'}`}>
                                                            <p className={`text-xs font-semibold ${item.isMe ? 'text-white opacity-80' : 'text-red-400'}`}>
                                                                {item.replyTo.senderName || 'Unknown'}
                                                            </p>
                                                            <p className={`text-xs ${item.isMe ? 'text-white opacity-70' : 'text-gray-400'} truncate`}>
                                                                {item.replyTo.content || 'Message'}
                                                            </p>
                                                        </div>
                                                    )}

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

                                                {/* Three-dot menu (show for all messages except temp ones) */}
                                                {!item.isDeleted && !item.id.toString().startsWith('temp-') && (
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
                                                                        copyMessageText(item.text);
                                                                    }}
                                                                    className={`w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2 ${item.isMe ? '' : 'rounded-t-lg'}`}
                                                                >
                                                                    <IoCopyOutline className="text-base" />
                                                                    <span className="text-sm">Copy</span>
                                                                </button>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        startReplyMessage(item);
                                                                    }}
                                                                    className={`w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2 ${item.isMe ? '' : 'rounded-b-lg'}`}
                                                                >
                                                                    <IoArrowUndoOutline className="text-base" />
                                                                    <span className="text-sm">Reply</span>
                                                                </button>
                                                                {item.isMe && (
                                                                    <>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                startEditMessage(item);
                                                                                setShowMessageMenu(null);
                                                                            }}
                                                                            className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                                                                        >
                                                                            <IoCreateOutline className="text-base" />
                                                                            <span className="text-sm">Edit</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteMessage(item.id);
                                                                                setShowMessageMenu(null);
                                                                            }}
                                                                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center gap-2 rounded-b-lg"
                                                                            title="Delete"
                                                                        >
                                                                            <IoTrashOutline className="text-base" />
                                                                            <span className="text-sm">Delete</span>
                                                                        </button>
                                                                    </>
                                                                )}
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
                            </>
                        );
                    })}
                    {typingUsers.length > 0 && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </>
            )}
            </div>

            {/* Scroll to Bottom Button - Shows when scrolled up */}
            {
                isUserScrolledUp && (
                    <button
                        onClick={() => scrollToBottom(false)}
                        className="absolute bottom-24 sm:bottom-28 right-4 sm:right-6 w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center shadow-lg z-50 hover:bg-gray-600 transition-colors"
                    >
                        <IoArrowDown className="text-white text-xl" />
                        {/* Red dot badge for unread messages */}
                        {newMessageCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center">
                                <span className="text-white text-xs font-bold"></span>
                            </span>
                        )}
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

                {/* Reply Mode Indicator */}
                {replyingToMessage && !editingMessageId && (
                    <div className="mb-2 bg-[#2d2d2d] px-3 py-2 rounded-lg border border-gray-700">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <IoArrowUndoOutline className="text-red-400 text-base flex-shrink-0" />
                                    <span className="text-xs text-gray-400">Replying to {replyingToMessage.senderName}</span>
                                </div>
                                <p className="text-sm text-gray-300 truncate pl-6">
                                    {replyingToMessage.text}
                                </p>
                            </div>
                            <button
                                onClick={cancelReply}
                                className="p-1 hover:bg-gray-700 rounded ml-2 flex-shrink-0"
                            >
                                <IoCloseCircle className="text-gray-400 text-xl" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-end gap-1 sm:gap-2 relative">
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <div className="emoji-picker-container absolute bottom-14 left-0 z-50">
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                theme="dark"
                                width={300}
                                height={400}
                            />
                        </div>
                    )}

                    <button
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="w-9 h-9 sm:w-10 sm:h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors flex-shrink-0"
                    >
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

                            <button
                                onClick={openCamera}
                                className="hidden sm:flex w-10 h-10 bg-[#2d2d2d] rounded-full items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors flex-shrink-0"
                            >
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

            {/* Camera Modal */}
            {
                showCamera && (
                    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                        <div className="relative w-full h-full max-w-2xl max-h-[80vh] flex flex-col items-center justify-center p-4">
                            {/* Close button */}
                            <button
                                onClick={closeCamera}
                                className="absolute top-4 right-4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-10"
                            >
                                <IoCloseCircle className="text-white text-2xl" />
                            </button>

                            {/* Video preview */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-auto max-h-[70vh] rounded-lg shadow-2xl"
                            />

                            {/* Capture button */}
                            <button
                                onClick={capturePhoto}
                                className="mt-6 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-200 transition-colors"
                            >
                                <IoCamera className="text-gray-800 text-3xl" />
                            </button>

                            {/* Hidden canvas for capturing */}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                    </div>
                )
            }
        </div>
    );
}
