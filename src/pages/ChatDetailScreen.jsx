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
import { useWebSocket } from '../contexts/WebSocketContext';

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

  console.log('Chat screen params:', { id, name, avatar, receiverId });

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showNewMessageNotification, setShowNewMessageNotification] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
  const [userPrivateKey, setUserPrivateKey] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const textInputRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const typingTimeoutRef = useRef(null);

  const chatRoomId = parseInt(id);
  const receiverUserId = parseInt(receiverId);

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

  console.log('Parsed IDs:', { chatRoomId, receiverUserId });
  console.log('WebSocket Status:', { connected, connecting, wsError });

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
        console.log('=== LOADING ENCRYPTION STATE ===');
        const decryptedBackendData = localStorage.getItem('decryptedBackendData');
        const encryptionState = localStorage.getItem(`encryption_${chat

    // Simulate WebSocket connection
    useEffect(() => {
        setTimeout(() => setConnected(true), 1000);
    }, []);

    const loadChatMessages = async () => {
        try {
            setLoading(true);

            const currentUserId = await ApiUtils.getCurrentUserId();

            if (!currentUserId || !chatRoomId) {
                console.log('Missing userId or chatRoomId');
                setMessages([]);
                return;
            }

            console.log('Loading messages for chatRoomId:', chatRoomId, 'userId:', currentUserId);

            const response = await chatApiService.getChatRoomMessages(chatRoomId, currentUserId, {
                pageNumber: 1,
                size: 1000,
                sortBy: 'sentAt',
            });

            console.log('Chat messages API response:', response);

            const transformedMessages = (response.data || []).map((msg, index) => {
                let messageText = msg.content || msg.message || '';

                return {
                    id: msg.chatMessageId?.toString() || msg.messageId?.toString() || `msg-${index}`,
                    text: messageText,
                    time: msg.sentAt ? formatMessageTime(msg.sentAt) : '12:00 AM',
                    isMe: msg.senderId === currentUserId,
                    status: msg.status || 'delivered',
                    timestamp: msg.sentAt || new Date().toISOString(),
                    senderName: msg.senderName || (msg.senderId === currentUserId ? 'You' : name),
                    senderId: msg.senderId,
                    receiverId: msg.receiverId,
                    isEncrypted: false,
                };
            });

            setMessages(transformedMessages);
            lastMessageCountRef.current = transformedMessages.length;
        } catch (error) {
            console.error('Error loading chat messages:', error);
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
        console.log('Send button pressed! Message:', message);

        if (message.trim()) {
            try {
                const currentUserId = await ApiUtils.getCurrentUserId();

                if (!currentUserId || !chatRoomId || !receiverUserId) {
                    alert('Missing required information to send message');
                    return;
                }

                const newMessage = {
                    id: Date.now().toString(),
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

                setMessages((prev) => [...prev, newMessage]);
                setMessage('');

                // Simulate sending via WebSocket
                console.log('Sending message via WebSocket...');

                // Update status to sent after a delay
                setTimeout(() => {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
                        )
                    );
                }, 500);

                // Auto scroll to bottom
                setTimeout(() => scrollToBottom(), 100);
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Failed to send message');
            }
        }
    };

    const handleTextChange = (text) => {
        setMessage(text);
        // Typing indicator logic can be added here
    };

    const handleCallPress = (isVideo) => {
        console.log('Call button pressed:', isVideo ? 'Video' : 'Audio');

        if (!connected) {
            alert('WebSocket is not connected. Please wait a moment and try again.');
            return;
        }

        // Navigate to call screen (to be implemented)
        console.log('Navigate to call screen');
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
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-[#1a1a1a]">
                <div className="flex items-center flex-1">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center shadow-lg border border-gray-700 mr-4 hover:bg-gray-700 transition-colors"
                    >
                        <IoArrowBack className="text-white text-xl" />
                    </button>
                    <img
                        src={decodeURIComponent(avatar || '')}
                        alt={name}
                        className="w-10 h-10 rounded-full mr-4 shadow-lg"
                        onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/40';
                        }}
                    />
                    <div className="flex-1">
                        <h2 className="text-white font-bold text-lg">{name || 'Unknown'}</h2>
                        <p className="text-gray-400 text-sm">
                            {typingUsers.length > 0
                                ? 'Typing...'
                                : isEncryptionEnabled
                                    ? '🔒 Encrypted Chat'
                                    : connected
                                        ? 'Online'
                                        : 'Connecting...'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleCallPress(true)}
                        className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
                    >
                        <IoVideocam className="text-white text-xl" />
                    </button>
                    <button
                        onClick={() => handleCallPress(false)}
                        className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                        <IoCall className="text-white text-xl" />
                    </button>
                </div>
            </div>

            {/* Date Separator */}
            <div className="flex flex-col items-center py-4">
                <p className="text-gray-400 text-sm">Today</p>
                {isEncryptionEnabled && (
                    <div className="flex items-center mt-2 px-3 py-1 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 rounded-full">
                        <IoShieldCheckmark className="text-green-400 text-sm mr-1" />
                        <span className="text-green-400 text-xs font-medium">
                            End-to-End Encrypted
                        </span>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-5 pb-5"
            >
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
                            <div
                                key={item.id}
                                className={`flex my-2 ${item.isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`${maxWidth} px-4 py-3 rounded-2xl shadow-lg ${item.isMe
                                            ? 'bg-red-500 ml-10'
                                            : 'bg-[#2d2d2d] border border-gray-700 mr-10'
                                        }`}
                                >
                                    <div className="flex items-start">
                                        <p
                                            className={`text-base leading-relaxed ${item.isMe ? 'text-white' : 'text-white'
                                                }`}
                                        >
                                            {item.text}
                                        </p>
                                        {item.isEncrypted && (
                                            <IoLockClosed
                                                className={`ml-2 mt-1 text-xs ${item.isMe ? 'text-white opacity-70' : 'text-gray-400'
                                                    }`}
                                            />
                                        )}
                                    </div>
                                    <p
                                        className={`text-xs mt-1 ${item.isMe ? 'text-white opacity-70' : 'text-gray-400'
                                            }`}
                                    >
                                        {item.time}
                                    </p>
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
                    className="absolute bottom-32 left-5 right-5 bg-red-500 rounded-full py-3 px-4 shadow-lg flex items-center justify-center z-50 hover:bg-red-600 transition-colors"
                >
                    <IoArrowDown className="text-white text-base mr-2" />
                    <span className="text-white text-sm font-semibold">
                        {newMessageCount} new message{newMessageCount > 1 ? 's' : ''}
                    </span>
                </button>
            )}

            {/* Message Input */}
            <div className="bg-[#1a1a1a] px-5 py-4">
                <div className="flex items-end gap-2">
                    <button className="w-10 h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors">
                        <IoHappyOutline className="text-gray-400 text-xl" />
                    </button>

                    <textarea
                        ref={textInputRef}
                        value={message}
                        onChange={(e) => handleTextChange(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message"
                        className="flex-1 bg-[#2d2d2d] border border-gray-700 rounded-3xl px-5 py-3 text-white placeholder-gray-500 outline-none resize-none shadow-lg max-h-24 min-h-[44px]"
                        rows={1}
                    />

                    <button className="w-10 h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors">
                        <IoAttach className="text-gray-400 text-xl" />
                    </button>

                    <button className="w-10 h-10 bg-[#2d2d2d] rounded-full flex items-center justify-center shadow-lg border border-gray-700 hover:bg-gray-700 transition-colors">
                        <IoCamera className="text-white text-xl" />
                    </button>

                    <button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${message.trim()
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-gray-600 cursor-not-allowed'
                            }`}
                    >
                        <IoSend className="text-white text-xl" />
                    </button>
                </div>
            </div>
        </div>
    );
}
