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

    const receiverUserId = parseInt(receiverId);
    
    // Use the global online status hook
    const isReceiverOnline = useUserOnlineStatus(receiverUserId);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const textInputRef = useRef(null);
    const lastMessageCountRef = useRef(0);
    const typingTimeoutRef = useRef(null);

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

        // Subscribe to chat messages
        const messageDestination = `/topic/chat/${chatRoomId}/${currentUserId}`;
        console.log('Subscribing to:', messageDestination);

        const messageSubscription = subscribe(messageDestination, (wsMessage) => {
            console.log('📨 WebSocket message received:', wsMessage);

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
                // Check for duplicates
                const exists = prev.some((m) => m.id === newMsg.id);
                if (exists) return prev;
                return [...prev, newMsg];
            });

            // Auto scroll if not scrolled up
            if (!isUserScrolledUp) {
                setTimeout(() => scrollToBottom(), 100);
            } else {
                setNewMessageCount((prev) => prev + 1);
                setShowNewMessageNotification(true);
            }
        });

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

        return () => {
            console.log('🧹 Unsubscribing from chat');
            if (messageSubscription) unsubscribe(messageDestination);
            if (typingSubscription) unsubscribe(typingDestination);
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
                text: msg.content || msg.message || '',
                time: msg.sentAt ? formatMessageTime(msg.sentAt) : '12:00 AM',
                isMe: msg.senderId === currentUserId,
                status: msg.status || 'delivered',
                timestamp: msg.sentAt || new Date().toISOString(),
                senderName: msg.senderName || (msg.senderId === currentUserId ? 'You' : name),
                senderId: msg.senderId,
                receiverId: msg.receiverId,
                isEncrypted: false,
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
                    // Update status
                    setMessages((prev) =>
                        prev.map((msg) => (msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg))
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
                        const messageLength = item.text?.length || 0;
                        let maxWidth = 'max-w-[75%]';
                        if (messageLength <= 20) maxWidth = 'max-w-fit';
                        else if (messageLength <= 50) maxWidth = 'max-w-[50%]';

                        return (
                            <div key={item.id} className={`flex my-1 sm:my-2 ${item.isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] px-3 sm:px-4 py-2 sm:py-3 rounded-2xl shadow-lg ${item.isMe ? 'bg-red-500' : 'bg-[#2d2d2d] border border-gray-700'
                                        }`}
                                    style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                                >
                                    <div className="flex items-start">
                                        <p className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${item.isMe ? 'text-white' : 'text-white'}`}
                                            style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                            {item.text}
                                        </p>
                                        {item.isEncrypted && (
                                            <IoLockClosed className={`ml-2 mt-1 text-xs flex-shrink-0 ${item.isMe ? 'text-white opacity-70' : 'text-gray-400'}`} />
                                        )}
                                    </div>
                                    <p className={`text-xs mt-1.5 ${item.isMe ? 'text-white opacity-70' : 'text-gray-400'}`}>{item.time}</p>
                                </div>
                            </div>
                        );
                    })
                )}

                {typingUsers.length > 0 && <TypingIndicator />}
                <div ref={messagesEndRef} />
            </div>

            {/* New Message Notification */}
            {showNewMessageNotification && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-24 sm:bottom-28 left-3 right-3 sm:left-5 sm:right-5 bg-red-500 rounded-full py-2 sm:py-3 px-3 sm:px-4 shadow-lg flex items-center justify-center z-50 hover:bg-red-600 transition-colors"
                >
                    <IoArrowDown className="text-white text-sm sm:text-base mr-2" />
                    <span className="text-white text-xs sm:text-sm font-semibold">
                        {newMessageCount} new message{newMessageCount > 1 ? 's' : ''}
                    </span>
                </button>
            )}

            {/* Message Input - Sticky Bottom */}
            <div className="sticky bottom-0 z-10 bg-[#1a1a1a] px-3 sm:px-5 py-3 sm:py-4 border-t border-gray-800 shadow-lg">
                <div className="flex items-end gap-1 sm:gap-2">
                    <button className="w-9 h-9 sm:w-10 sm:h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors flex-shrink-0">
                        <IoHappyOutline className="text-gray-400 text-lg sm:text-xl" />
                    </button>

                    <textarea
                        ref={textInputRef}
                        value={message}
                        onChange={(e) => handleTextChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message"
                        className="flex-1 bg-[#2d2d2d] border border-gray-700 rounded-3xl px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-gray-500 outline-none resize-none shadow-lg max-h-24 min-h-[40px] sm:min-h-[44px]"
                        rows={1}
                    />

                    <button className="hidden sm:flex w-10 h-10 bg-[#2d2d2d] rounded-full items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors flex-shrink-0">
                        <IoAttach className="text-gray-400 text-xl" />
                    </button>

                    <button className="hidden sm:flex w-10 h-10 bg-[#2d2d2d] rounded-full items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors flex-shrink-0">
                        <IoCamera className="text-white text-xl" />
                    </button>

                    <button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg transition-colors flex-shrink-0 ${message.trim() ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <IoSend className="text-white text-lg sm:text-xl" />
                    </button>
                </div>
            </div>
        </div>
    );
}
