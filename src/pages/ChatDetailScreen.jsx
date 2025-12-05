import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
    IoImages,
    IoDocument,
    IoClose,
    IoCloudUploadOutline,
    IoPlayCircle,
    IoDocumentText,
    IoMic,
    IoStop,
    IoPause,
    IoPlay,
    IoMusicalNote,
    IoDownload,
} from "react-icons/io5";
import EmojiPicker from "emoji-picker-react";
import { useCall } from "../contexts/CallContext";
import { ApiUtils } from "../services/AuthService";
import chatApiService from "../services/ChatApiService";
import EncryptionService from "../services/EncryptionService";
import DecryptEnvolop from "../scripts/decryptEnvelope";
import DecryptMessage from "../scripts/decryptMessage";
import {
    useWebSocket,
    useUserOnlineStatus,
} from "../contexts/WebSocketContext";
import { useToast } from "../contexts/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";

// WhatsApp-style Audio Player Component
const WhatsAppAudioPlayer = ({ audioUrl, isMe }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
        const audio = audioRef.current;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        audio.currentTime = percentage * duration;
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-2 min-w-[250px] max-w-[350px]">
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isMe
                    ? "bg-white bg-opacity-20 hover:bg-opacity-30"
                    : "bg-gray-600 hover:bg-gray-500"
                    }`}
            >
                {isPlaying ? (
                    <IoPause className="text-white text-lg" />
                ) : (
                    <IoPlay className="text-white text-lg ml-0.5" />
                )}
            </button>

            {/* Waveform/Progress Bar */}
            <div className="flex-1 flex flex-col gap-1">
                <div
                    onClick={handleSeek}
                    className="h-8 flex items-center cursor-pointer group"
                >
                    <div className="w-full h-1 bg-white bg-opacity-20 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all ${isMe ? "bg-white" : "bg-red-400"
                                }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between">
                    <span
                        className={`text-xs ${isMe ? "text-white opacity-70" : "text-gray-400"
                            }`}
                    >
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

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
    const toast = useToast();
    const { id } = useParams();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteMessageId, setDeleteMessageId] = useState(null);
    const [searchParams] = useSearchParams();

    const name = searchParams.get("name") || "Unknown";
    const avatar = searchParams.get("avatar") || "";
    const receiverId = searchParams.get("receiverId") || "";

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [typingUsers, setTypingUsers] = useState([]);
    const [showNewMessageNotification, setShowNewMessageNotification] =
        useState(false);
    const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [isEncryptionEnabled, setIsEncryptionEnabled] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Pagination state for messages
    const PAGE_SIZE = 20;
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Edit/Delete message states
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingMessageText, setEditingMessageText] = useState("");
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showMessageMenu, setShowMessageMenu] = useState(false);

    // Reply message states
    const [replyingToMessage, setReplyingToMessage] = useState(null);

    // Emoji picker state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Camera states
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [cameraFacingMode, setCameraFacingMode] = useState("user"); // 'user' = front, 'environment' = back
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // File upload states
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [showFilePreview, setShowFilePreview] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const fileInputRef = useRef(null);
    const photoInputRef = useRef(null);

    // Audio recording states
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioURL, setAudioURL] = useState(null);
    const [showAudioPreview, setShowAudioPreview] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingIntervalRef = useRef(null);
    const audioPreviewRef = useRef(null);

    // Media viewer states
    const [showMediaViewer, setShowMediaViewer] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [viewerMediaList, setViewerMediaList] = useState([]);
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
    const imageRef = useRef(null);

    // Keyboard visibility state
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    const receiverUserId = parseInt(receiverId);

    // Debug: Log component mount and params
    useEffect(() => {
        console.log("🎬 ChatDetailScreen MOUNTED/UPDATED");
        console.log("📍 Route params:", { id, chatRoomId: parseInt(id) });
        console.log("📍 Query params:", {
            name,
            avatar,
            receiverId,
            receiverUserId,
        });
        console.log("📍 Valid receiverUserId:", !isNaN(receiverUserId));
    }, [id, name, avatar, receiverId, receiverUserId]);

    // Use the global online status hook
    const isReceiverOnline = useUserOnlineStatus(receiverUserId);

    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const textInputRef = useRef(null);
    const lastMessageCountRef = useRef(0);
    const typingTimeoutRef = useRef(null);
    const markedAsReadRef = useRef(new Set()); // Track which messages have been marked as read
    const canLoadMoreRef = useRef(true); // Prevent multiple auto-loads from layout changes (images, long text)

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

    // Keyboard detection for mobile devices
    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                const viewportHeight = window.visualViewport.height;
                const windowHeight = window.innerHeight;
                const heightDiff = windowHeight - viewportHeight;

                // If viewport is significantly smaller, keyboard is open
                if (heightDiff > 150) {
                    setIsKeyboardOpen(true);
                    setKeyboardHeight(heightDiff);
                } else {
                    setIsKeyboardOpen(false);
                    setKeyboardHeight(0);
                }
            }
        };

        // Listen to visual viewport resize (more reliable for keyboard detection)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            window.visualViewport.addEventListener('scroll', handleResize);
        }

        // Fallback for older browsers
        window.addEventListener('resize', handleResize);

        // Initial check
        handleResize();

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
                window.visualViewport.removeEventListener('scroll', handleResize);
            }
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Close message menu and emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMessageMenu && !event.target.closest(".message-menu")) {
                setShowMessageMenu(null);
            }
            if (showEmojiPicker && !event.target.closest(".emoji-picker-container")) {
                setShowEmojiPicker(false);
            }
            if (showAttachMenu && !event.target.closest(".attach-menu-container")) {
                setShowAttachMenu(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showMessageMenu, showEmojiPicker, showAttachMenu]);

    // Mark messages as read when they appear (only once per message)
    useEffect(() => {
        if (!connected || !currentUserId) return;

        messages.forEach((item) => {
            // Only mark unread messages from other users that haven't been marked yet
            if (
                !item.isMe &&
                !item.isRead &&
                item.id &&
                !item.id.toString().startsWith("temp-") &&
                !markedAsReadRef.current.has(item.id)
            ) {
                markedAsReadRef.current.add(item.id);
                markMessageAsRead(item.id);
            }
        });
    }, [messages, connected, currentUserId]);

    // Load encryption state
    useEffect(() => {
        const loadEncryptionState = async () => {
            try {
                const decryptedBackendData = localStorage.getItem(
                    "decryptedBackendData"
                );
                if (decryptedBackendData) {
                    setIsEncryptionEnabled(true);
                }
            } catch (error) {
                console.error("Error loading encryption state:", error);
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
        if (
            !connected ||
            !currentUserId ||
            !chatRoomId ||
            !receiverUserId ||
            isNaN(receiverUserId)
        ) {
            console.log("⏳ Waiting for WebSocket subscription requirements:", {
                connected,
                currentUserId,
                chatRoomId,
                receiverUserId,
                isValid: !isNaN(receiverUserId),
            });
            return;
        }
        // Subscribe to messages we send (as sender)
        const senderDestination = `/topic/chat/${chatRoomId}/${currentUserId}/${receiverUserId}`;
        // Subscribe to messages we receive (as receiver)
        const receiverDestination = `/topic/chat/${chatRoomId}/${receiverUserId}/${currentUserId}`;
        const handleMessage = async (wsMessage) => {
            // Skip typing indicators
            if (
                wsMessage.typing !== undefined ||
                wsMessage.messageType === "TYPING"
            ) {
                return;
            }

            // Decrypt message if encrypted
            const privateKey = EncryptionService.decrypt(
                localStorage.getItem("decryptedBackendData")
            );
            const userId = localStorage.getItem("userId");
            let decryptedText = wsMessage.content || wsMessage.message || "";

            if (wsMessage.sender_envolop || wsMessage.receiver_envolop) {
                try {
                    const envolop =
                        wsMessage.senderId?.toString() === userId
                            ? wsMessage.sender_envolop
                            : wsMessage.receiver_envolop;

                    if (envolop && privateKey) {
                        console.log("🔐 Decrypting WebSocket envelope");
                        const envolopDecryptKey = await DecryptEnvolop.decryptEnvelope(
                            envolop,
                            privateKey
                        );

                        console.log("🔐 Decrypting WebSocket message:", wsMessage.content);
                        decryptedText = await DecryptMessage(
                            wsMessage.content,
                            envolopDecryptKey
                        );
                        console.log("✅ Decrypted WebSocket message:", decryptedText);
                    }
                } catch (error) {
                    console.error("❌ Failed to decrypt WebSocket message:", error);
                }
            }

            // Decrypt replyTo message if exists
            let decryptedReplyTo = wsMessage.replyTo;
            if (wsMessage.replyTo && wsMessage.replyTo.content && privateKey) {
                console.log(
                    "🔍 WebSocket replyTo object:",
                    JSON.stringify(wsMessage.replyTo, null, 2)
                );
                try {
                    const replyEnvolop =
                        wsMessage.replyTo.senderId?.toString() === userId
                            ? wsMessage.replyTo.sender_envolop
                            : wsMessage.replyTo.receiver_envolop;

                    console.log("🔍 Reply envelope found:", !!replyEnvolop);
                    console.log(
                        "🔍 Reply senderId:",
                        wsMessage.replyTo.senderId,
                        "Current userId:",
                        userId
                    );

                    if (replyEnvolop) {
                        console.log("🔐 Decrypting WebSocket reply envelope");
                        const replyEnvolopKey = await DecryptEnvolop.decryptEnvelope(
                            replyEnvolop,
                            privateKey
                        );

                        console.log("🔐 Decrypting WebSocket reply message");
                        const decryptedReplyContent = await DecryptMessage(
                            wsMessage.replyTo.content,
                            replyEnvolopKey
                        );
                        console.log("✅ Decrypted WebSocket reply:", decryptedReplyContent);

                        decryptedReplyTo = {
                            ...wsMessage.replyTo,
                            content: decryptedReplyContent,
                        };
                    } else {
                        console.warn("⚠️ No reply envelope found for decryption");
                    }
                } catch (error) {
                    console.error("❌ Failed to decrypt WebSocket reply:", error);
                }
            }

            // Add new message to state
            const newMsg = {
                id: wsMessage.chatMessageId || wsMessage.id || `ws-${Date.now()}`,
                text: decryptedText,
                time: formatMessageTime(wsMessage.timestamp || wsMessage.sentAt),
                isMe: wsMessage.senderId === currentUserId,
                status: "delivered",
                timestamp:
                    wsMessage.timestamp || wsMessage.sentAt || new Date().toISOString(),
                senderName:
                    wsMessage.senderName ||
                    (wsMessage.senderId === currentUserId ? "You" : name),
                senderId: wsMessage.senderId,
                receiverId: wsMessage.receiverId,
                isEncrypted: !!(wsMessage.sender_envolop || wsMessage.receiver_envolop),
                isEdited: wsMessage.isEdited || false,
                editedAt: wsMessage.editedAt || null,
                replyTo: decryptedReplyTo,
                attachments: (wsMessage.attachments || []).map((att) => ({
                    fileURL: att.fileURL || att.fileUrl,
                    fileType: att.fileType,
                })),
            };

            console.log("📨 WebSocket message received:", {
                id: newMsg.id,
                text: newMsg.text.substring(0, 30),
                isMe: newMsg.isMe,
                attachmentsCount: newMsg.attachments?.length || 0,
                attachments: newMsg.attachments,
            });

            // Check if message is from another user
            const isNewMessageFromOthers = !newMsg.isMe;

            setMessages((prev) => {
                // Check for duplicates by real ID
                const existsById = prev.some(
                    (m) =>
                        m.id === newMsg.id &&
                        !m.id.toString().startsWith("temp-") &&
                        !m.id.toString().includes(`${currentUserId}-`)
                );
                if (existsById) {
                    return prev;
                }

                // If this is from current user, replace the temporary/pseudo message
                if (newMsg.isMe) {
                    // Find and replace temp or pseudo ID message with matching content
                    const tempIndex = prev.findIndex((m) => {
                        const isTempOrPseudo =
                            m.id.toString().startsWith("temp-") ||
                            m.id.toString().includes(`${currentUserId}-`);

                        if (!isTempOrPseudo || !m.isMe) return false;

                        // Match by text content
                        const textMatches = m.text === newMsg.text;

                        // Match by attachments (if both have attachments, compare count and types)
                        const bothHaveAttachments =
                            m.attachments?.length > 0 && newMsg.attachments?.length > 0;
                        const attachmentsMatch = bothHaveAttachments
                            ? m.attachments.length === newMsg.attachments.length
                            : true;

                        return textMatches && attachmentsMatch;
                    });

                    if (tempIndex !== -1) {
                        const updated = [...prev];
                        const tempMessage = prev[tempIndex];
                        // Preserve replyTo from temp message if not in newMsg, and merge attachments
                        updated[tempIndex] = {
                            ...newMsg,
                            status: "sent",
                            replyTo: newMsg.replyTo || tempMessage.replyTo,
                            attachments: newMsg.attachments || tempMessage.attachments || [],
                        };
                        console.log(
                            "✅ Replaced temp message with real message:",
                            updated[tempIndex]
                        );
                        return updated;
                    } else {
                        console.log(
                            "⚠️ No matching temp message found for:",
                            newMsg.text.substring(0, 20),
                            "Attachments:",
                            newMsg.attachments?.length || 0
                        );
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

                // Auto-scroll if user is at bottom
                setTimeout(() => {
                    const container = messagesContainerRef.current;
                    if (container) {
                        const { scrollTop, scrollHeight, clientHeight } = container;
                        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 100;
                        if (isAtBottom) {
                            scrollToBottom(false);
                        }
                    }
                }, 100);
            } else {
                // For messages from current user, always auto-scroll
                setTimeout(() => scrollToBottom(false), 100);
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
        const handleEditMessage = async (editMsg) => {
            console.log(
                "✏️ Edit message received:",
                JSON.stringify(editMsg, null, 2)
            );

            const messageData = editMsg.data || editMsg;
            const editedMessageId = messageData.chatMessageId;

            // Decrypt edited message content
            const privateKey = EncryptionService.decrypt(
                localStorage.getItem("decryptedBackendData")
            );
            const userId = localStorage.getItem("userId");
            let decryptedContent = messageData.content;

            if (messageData.sender_envolop || messageData.receiver_envolop) {
                try {
                    const envolop =
                        messageData.senderId?.toString() === userId
                            ? messageData.sender_envolop
                            : messageData.receiver_envolop;

                    if (envolop && privateKey) {
                        console.log("🔐 Decrypting edited message envelope");
                        const envolopDecryptKey = await DecryptEnvolop.decryptEnvelope(
                            envolop,
                            privateKey
                        );

                        console.log("🔐 Decrypting edited message content");
                        decryptedContent = await DecryptMessage(
                            messageData.content,
                            envolopDecryptKey
                        );
                        console.log("✅ Decrypted edited message:", decryptedContent);
                    }
                } catch (error) {
                    console.error("❌ Failed to decrypt edited message:", error);
                }
            }

            // Decrypt replyTo message content if exists
            let decryptedReplyTo = messageData.replyTo;
            if (messageData.replyTo && messageData.replyTo.content && privateKey) {
                try {
                    const replyEnvolop =
                        messageData.replyTo.senderId?.toString() === userId
                            ? messageData.replyTo.sender_envolop
                            : messageData.replyTo.receiver_envolop;

                    if (replyEnvolop) {
                        console.log("🔐 Decrypting edited message reply envelope");
                        const replyEnvolopKey = await DecryptEnvolop.decryptEnvelope(
                            replyEnvolop,
                            privateKey
                        );

                        console.log("🔐 Decrypting edited message reply content");
                        const decryptedReplyContent = await DecryptMessage(
                            messageData.replyTo.content,
                            replyEnvolopKey
                        );
                        console.log(
                            "✅ Decrypted edited message reply:",
                            decryptedReplyContent
                        );

                        decryptedReplyTo = {
                            ...messageData.replyTo,
                            content: decryptedReplyContent,
                        };
                    }
                } catch (error) {
                    console.error("❌ Failed to decrypt edited message reply:", error);
                }
            }

            setMessages((prev) => {
                const updated = prev.map((msg) => {
                    if (
                        msg.id == editedMessageId ||
                        msg.id === editedMessageId.toString()
                    ) {
                        return {
                            ...msg,
                            text: decryptedContent || msg.text,
                            replyTo: decryptedReplyTo || msg.replyTo,
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

        const editSenderSubscription = subscribe(
            editSenderDestination,
            handleEditMessage
        );
        const editReceiverSubscription = subscribe(
            editReceiverDestination,
            handleEditMessage
        );

        // Subscribe to delete messages
        const deleteDestination = `/topic/chat/${chatRoomId}/delete`;
        const deleteSubscription = subscribe(deleteDestination, (deleteMsg) => {
            const messageData = deleteMsg.data || deleteMsg;
            const deletedMessageId = messageData.chatMessageId;

            setMessages((prev) =>
                prev.map((msg) => {
                    if (
                        msg.id == deletedMessageId ||
                        msg.id === deletedMessageId.toString()
                    ) {
                        return {
                            ...msg,
                            text: null,
                            isDeleted: true,
                            deletedAt: messageData.deletedAt || new Date().toISOString(),
                        };
                    }
                    return msg;
                })
            );
        });

        // Subscribe to read receipts - both as sender and receiver
        const readSenderDestination = `/topic/chat/read/${chatRoomId}/${currentUserId}/${receiverUserId}`;
        const readReceiverDestination = `/topic/chat/read/${chatRoomId}/${receiverUserId}/${currentUserId}`;
        const handleReadReceipt = (readMsg) => {
            console.log(
                "✅ Read receipt received:",
                JSON.stringify(readMsg, null, 2)
            );

            const messageData = readMsg.data || readMsg;
            const readMessageId = messageData.chatMessageId || messageData.messageId;
            setMessages((prev) => {
                const updated = prev.map((msg) => {
                    if (msg.id == readMessageId || msg.id === readMessageId.toString()) {
                        return {
                            ...msg,
                            isRead: true,
                            readAt: messageData.readAt || new Date().toISOString(),
                            status: "read",
                        };
                    }
                    return msg;
                });

                const wasUpdated = updated.some((m, i) => m.status !== prev[i].status);
                return updated;
            });
        };

        const readSenderSubscription = subscribe(
            readSenderDestination,
            handleReadReceipt
        );
        const readReceiverSubscription = subscribe(
            readReceiverDestination,
            handleReadReceipt
        );

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
    }, [
        connected,
        currentUserId,
        chatRoomId,
        receiverUserId,
        subscribe,
        unsubscribe,
        isUserScrolledUp,
    ]);

    const loadChatMessages = async (pageToLoad = 1, anchorSnapshot = null) => {
        try {
            const isFirstPage = pageToLoad === 1;
            if (isFirstPage) {
                setLoading(true);
                setHasMoreMessages(true);
            } else {
                setIsLoadingMore(true);
            }

            const response = await chatApiService.getChatRoomMessages(
                chatRoomId,
                currentUserId,
                {
                    pageNumber: pageToLoad,
                    size: PAGE_SIZE,
                    sortBy: "sentAt",
                    sortDirection: "desc",
                }
            );

            const responseData = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response)
                    ? response
                    : [];

            // Decrypt messages before mapping
            const privateKey = EncryptionService.decrypt(
                localStorage.getItem("decryptedBackendData")
            );
            const userId = localStorage.getItem("userId");
            console.log("Decrypted private key:", privateKey);

            const pageMessages = await Promise.all(
                responseData.map(async (msg, index) => {
                    let envolop =
                        msg.senderId.toString() === userId
                            ? msg?.sender_envolop || null
                            : msg?.receiver_envolop || null;
                    let decryptedText = msg?.content || null;
                    let envolopDecryptKey = null;
                    // // decryptEnvolop
                    if (envolop && privateKey) {
                        console.log("🔐 private Key:", privateKey);
                        try {
                            console.log("🔐 Decrypting envolop:", envolop);
                            // if(msg.senderId.toString() === userId){
                            envolopDecryptKey = await DecryptEnvolop.decryptEnvelope(
                                envolop,
                                privateKey
                            );
                            console.log("envolopDecryptKey", envolopDecryptKey);
                        } catch (error) {
                            console.error("❌ Failed to decrypt Envolope:", error);
                        }
                    }
                    // decryptMessage
                    if (msg.content && privateKey) {
                        try {
                            console.log("🔐 Decrypting message:", msg.content);
                            decryptedText = await DecryptMessage(
                                msg.content,
                                envolopDecryptKey
                            );
                            console.log("Decrypted message text:", decryptedText);
                        } catch (error) {
                            console.error(
                                "❌ Failed to decrypt message:",
                                msg.chatMessageId,
                                error
                            );
                            // Keep encrypted content if decryption fails
                        }
                    }

                    // Decrypt replyTo message content if exists
                    let decryptedReplyTo = msg.replyTo;
                    if (msg.replyTo && msg.replyTo.content && privateKey) {
                        try {
                            // Get envelope for reply message
                            const replyEnvolop =
                                msg.replyTo.senderId?.toString() === userId
                                    ? msg.replyTo.sender_envolop || null
                                    : msg.replyTo.receiver_envolop || null;

                            if (replyEnvolop) {
                                console.log("🔐 Decrypting reply envelope");
                                const replyEnvolopKey = await DecryptEnvolop.decryptEnvelope(
                                    replyEnvolop,
                                    privateKey
                                );

                                console.log(
                                    "🔐 Decrypting reply message:",
                                    msg.replyTo.content
                                );
                                const decryptedReplyContent = await DecryptMessage(
                                    msg.replyTo.content,
                                    replyEnvolopKey
                                );
                                console.log("✅ Decrypted reply text:", decryptedReplyContent);

                                decryptedReplyTo = {
                                    ...msg.replyTo,
                                    content: decryptedReplyContent,
                                };
                            }
                        } catch (error) {
                            console.error("❌ Failed to decrypt reply message:", error);
                            // Keep encrypted reply content if decryption fails
                        }
                    }

                    // Generate initials from sender name
                    const senderName =
                        msg.senderName || (msg.senderId === currentUserId ? "You" : name);
                    const nameParts = senderName.split(" ");
                    const firstInitial = nameParts[0]?.charAt(0).toUpperCase() || "U";
                    const lastInitial = nameParts[1]?.charAt(0).toUpperCase() || "";
                    const senderInitials = `${firstInitial}${lastInitial}`;

                    return {
                        id:
                            msg.chatMessageId?.toString() ||
                            msg.messageId?.toString() ||
                            `msg-${index}`,
                        text: decryptedText,
                        time: msg.sentAt ? formatMessageTime(msg.sentAt) : "12:00 AM",
                        isMe: msg.senderId === currentUserId,
                        status: msg.isRead ? "read" : msg.status || "delivered",
                        timestamp: msg.sentAt || new Date().toISOString(),
                        senderName: senderName,
                        senderProfileURL: msg.senderProfileURL || null,
                        senderInitials: senderInitials,
                        senderId: msg.senderId,
                        receiverId: msg.receiverId,
                        isEncrypted: !!msg.envolop,
                        isRead: msg.isRead || false,
                        readAt: msg.readAt || null,
                        isEdited: msg.isEdited || false,
                        editedAt: msg.editedAt || null,
                        isDeleted: msg.content === null || msg.isDeleted === true,
                        deletedAt:
                            msg.deletedAt || (msg.content === null ? msg.sentAt : null),
                        replyTo: decryptedReplyTo,
                        attachments: (msg.attachments || []).map((att) => ({
                            fileURL: att.fileURL || att.fileUrl,
                            fileType: att.fileType,
                        })),
                    };
                })
            );

            // Ensure messages are sorted ascending by timestamp for display
            pageMessages.sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            if (isFirstPage) {
                // First page: just set messages and scroll to bottom
                setMessages(pageMessages);
            } else if (pageMessages.length > 0) {
                // Older page: prepend messages at the top.
                setMessages((prev) => {
                    const combined = [...pageMessages, ...prev];
                    combined.sort(
                        (a, b) =>
                            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    );
                    return combined;
                });

                // After DOM updates, restore the anchor message position so the
                // user visually stays at the same place in the conversation.
                if (anchorSnapshot?.id) {
                    setTimeout(() => {
                        const containerNow = messagesContainerRef.current;
                        const anchorElNow = document.getElementById(
                            `msg-${anchorSnapshot.id}`
                        );
                        if (containerNow && anchorElNow) {
                            const containerRect = containerNow.getBoundingClientRect();
                            const anchorRectNow = anchorElNow.getBoundingClientRect();
                            const currentOffset = anchorRectNow.top - containerRect.top;
                            const delta = currentOffset - anchorSnapshot.offset;
                            containerNow.scrollTop += delta;
                        }
                    }, 0);
                }
            }

            // Update paging flags
            setCurrentPage(pageToLoad);
            if (pageMessages.length < PAGE_SIZE) {
                setHasMoreMessages(false);
            }

            // Track how many messages we've loaded so far
            lastMessageCountRef.current = isFirstPage
                ? pageMessages.length
                : (lastMessageCountRef.current || 0) + pageMessages.length;

            // Auto scroll to bottom on initial page load
            if (isFirstPage) {
                setTimeout(() => scrollToBottom(true), 100);
            }
        } catch (error) {
            console.error("❌ Error loading messages:", error);
            setMessages([]);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
        }
    };

    const formatMessageTime = (timestamp) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            });
        } catch (error) {
            return "12:00 AM";
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
                return "Today";
            } else if (messageDate.getTime() === yesterday.getTime()) {
                return "Yesterday";
            } else {
                // Format as "27 October 2025" or day name if within last week
                const daysDiff = Math.floor(
                    (today - messageDate) / (1000 * 60 * 60 * 24)
                );
                if (daysDiff < 7) {
                    return date.toLocaleDateString("en-US", { weekday: "long" });
                } else {
                    return date.toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    });
                }
            }
        } catch (error) {
            return "";
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
                toast.error("Missing required information");
                return;
            }

            // Store replyTo data before clearing state
            const replyToData = replyingToMessage
                ? {
                    chatMessageId: replyingToMessage.id,
                    content: replyingToMessage.text,
                    senderName: replyingToMessage.senderName,
                }
                : null;
            const newMessage = {
                id: `temp-${Date.now()}`,
                text: message.trim(),
                time: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                }),
                isMe: true,
                status: "sending",
                timestamp: new Date().toISOString(),
                senderName: "You",
                senderId: currentUserId,
                receiverId: receiverUserId,
                replyTo: replyToData,
            };

            // Add to UI immediately
            setMessages((prev) => [...prev, newMessage]);
            setMessage("");
            setReplyingToMessage(null); // Clear reply state

            // Keep keyboard open by refocusing input
            setTimeout(() => {
                if (textInputRef.current) {
                    textInputRef.current.focus();
                }
            }, 50);

            // Send via WebSocket
            if (connected && sendSocketMessage) {
                // Build the payload matching ChatMessageRequest DTO
                const payload = {
                    content: newMessage.text,
                    messageType: "TEXT",
                    replyToId: replyToData ? parseInt(replyToData.chatMessageId) : null,
                    attachments: [],
                };

                const success = sendSocketMessage(
                    chatRoomId,
                    currentUserId,
                    receiverUserId,
                    payload
                );

                if (success) {
                    // Generate a pseudo-real ID (timestamp-based) to replace temp ID
                    // This allows the three-dot menu to appear immediately
                    const pseudoId = `${currentUserId}-${Date.now()}`;

                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === newMessage.id
                                ? { ...msg, id: pseudoId, status: "sent" }
                                : msg
                        )
                    );
                } else {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === newMessage.id ? { ...msg, status: "failed" } : msg
                        )
                    );
                }
            } else {
                toast.warning("WebSocket not connected. Please wait and try again.");
            }

            // Auto scroll
            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error("❌ Error sending message:", error);
            toast.error("Failed to send message");

            // Keep keyboard open even on error
            setTimeout(() => {
                if (textInputRef.current) {
                    textInputRef.current.focus();
                }
            }, 50);
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
            console.error("❌ Failed to send read receipt for message:", messageId);
        }
    };

    // Delete message - show confirmation
    const handleDeleteMessage = (messageId) => {
        if (!messageId || !currentUserId || !chatRoomId) return;
        setDeleteMessageId(messageId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteMessage = () => {
        if (!deleteMessageId) return;

        const destination = `/app/chat/delete/${chatRoomId}/${deleteMessageId}/${currentUserId}`;
        const success = publish(destination, {});

        if (success) {
            setShowMessageMenu(null);
            setSelectedMessage(null);
            toast.success("Message deleted");
        } else {
            toast.error("Failed to delete message");
        }

        setShowDeleteConfirm(false);
        setDeleteMessageId(null);
    };

    const cancelDeleteMessage = () => {
        setShowDeleteConfirm(false);
        setDeleteMessageId(null);
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
                messageType: "TEXT",
            };
            const success = publish(destination, payload);

            if (success) {
                // Optimistically update the message locally
                setMessages((prev) =>
                    prev.map((msg) => {
                        if (
                            msg.id == editingMessageId ||
                            msg.id === editingMessageId.toString()
                        ) {
                            return {
                                ...msg,
                                text: message.trim(),
                                isEdited: true,
                                editedAt: new Date().toISOString(),
                            };
                        }
                        return msg;
                    })
                );
            } else {
                toast.error("Failed to edit message");
            }
        }

        // Clear editing state
        setEditingMessageId(null);
        setEditingMessageText("");
        setMessage("");
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingMessageId(null);
        setEditingMessageText("");
        setMessage("");
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
            navigator.clipboard
                .writeText(text)
                .then(() => {
                    setShowMessageMenu(null);
                    toast.success("Message copied!");
                })
                .catch((err) => {
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
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand("copy");
            setShowMessageMenu(null);
            toast.success("Message copied!");
        } catch (err) {
            toast.error("Failed to copy message");
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

    // Open camera - Navigate to full camera screen
    const openCamera = () => {
        // Build the full return URL with all query parameters
        const returnUrl = `/chat/${id}?name=${encodeURIComponent(
            name
        )}&avatar=${encodeURIComponent(avatar || "")}&receiverId=${receiverId}`;
        // Navigate to camera screen with chat context
        navigate(
            `/camera?returnTo=${encodeURIComponent(
                returnUrl
            )}&name=${encodeURIComponent(name)}&avatar=${encodeURIComponent(
                avatar || ""
            )}&receiverId=${receiverId}&chatRoomId=${chatRoomId}`
        );
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
            const context = canvas.getContext("2d");

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // If front camera, flip the image horizontally for natural look
            if (cameraFacingMode === "user") {
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
            }

            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert canvas to blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Create a file from blob
                        const file = new File([blob], `photo-${Date.now()}.jpg`, {
                            type: "image/jpeg",
                        });

                        // Add to selected files for preview
                        const fileWithPreview = {
                            file,
                            preview: URL.createObjectURL(blob),
                            type: "image/jpeg",
                            name: file.name,
                            size: file.size,
                        };

                        setSelectedFiles([fileWithPreview]);
                        setShowFilePreview(true);
                        closeCamera();
                    }
                },
                "image/jpeg",
                0.95
            );
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

    // File upload functions
    const handleFileSelect = (event, type = "file") => {
        console.log("File select triggered, type:", type);
        console.log("Files selected:", event.target.files.length);

        const files = Array.from(event.target.files);
        if (files.length > 0) {
            console.log(
                "Processing files:",
                files.map((f) => f.name)
            );
            const filesWithPreview = files.map((file) => ({
                file,
                preview: URL.createObjectURL(file),
                type: file.type,
                name: file.name,
                size: file.size,
            }));
            setSelectedFiles(filesWithPreview);
            setShowFilePreview(true);
            setShowAttachMenu(false);
        } else {
            console.log("No files selected");
        }
        // Reset input value to allow selecting the same file again
        event.target.value = "";
    };

    const removeSelectedFile = (index) => {
        setSelectedFiles((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            // Revoke URL to free memory
            URL.revokeObjectURL(prev[index].preview);
            return updated;
        });
    };

    const uploadFilesToServer = async (files) => {
        const formData = new FormData();
        files.forEach(({ file }) => {
            formData.append("files", file);
        });

        try {
            const result = await chatApiService.uploadFiles(formData);
            return result;
        } catch (error) {
            console.error("Error uploading files:", error);
            throw error;
        }
    };

    const sendMessageWithAttachments = async () => {
        if (selectedFiles.length === 0 && !message.trim()) return;

        setUploadingFiles(true);
        try {
            let attachments = [];

            // Upload files if any
            if (selectedFiles.length > 0) {
                const uploadResult = await uploadFilesToServer(selectedFiles);
                // Handle different response structures
                attachments = Array.isArray(uploadResult) ? uploadResult : [];
                console.log("📤 Upload result:", uploadResult);
                console.log("📎 Parsed attachments:", attachments);

                // Validate attachment URLs
                attachments.forEach((att, idx) => {
                    console.log(`📎 Attachment ${idx}:`, {
                        fileURL: att.fileURL,
                        fileType: att.fileType,
                        fullObject: att,
                    });

                    if (!att.fileURL || att.fileURL.length < 10) {
                        console.error(`❌ Invalid fileURL for attachment ${idx}:`, att);
                    }
                });
            }

            // Prepare message
            const messageText = message.trim() || "";
            const replyToData = replyingToMessage
                ? {
                    chatMessageId: replyingToMessage.id,
                    content: replyingToMessage.text,
                    senderName: replyingToMessage.senderName,
                }
                : null;

            const mappedAttachments =
                attachments && attachments.length > 0
                    ? attachments.map((att) => ({
                        fileURL: att.fileURL,
                        fileType: att.fileType,
                    }))
                    : [];

            console.log("Creating message with attachments:", mappedAttachments);

            const newMessage = {
                id: `temp-${Date.now()}`,
                text: messageText,
                time: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                }),
                isMe: true,
                status: "sending",
                timestamp: new Date().toISOString(),
                senderName: "You",
                senderId: currentUserId,
                receiverId: receiverUserId,
                replyTo: replyToData,
                attachments: mappedAttachments,
            };

            console.log("📤 New message object with attachments:", newMessage);
            console.log("📎 Attachments count:", mappedAttachments.length);

            // Add to UI immediately
            setMessages((prev) => {
                const updated = [...prev, newMessage];
                console.log(
                    "✅ Added temp message to UI, total messages:",
                    updated.length
                );
                console.log("📎 Temp message attachments:", newMessage.attachments);
                return updated;
            });
            setMessage("");
            setReplyingToMessage(null);
            setSelectedFiles([]);
            setShowFilePreview(false);

            // Force scroll to show new message
            setTimeout(() => {
                scrollToBottom();
            }, 100);

            // Send via WebSocket
            if (connected && sendSocketMessage) {
                const payload = {
                    content: messageText,
                    messageType:
                        attachments && attachments.length > 0 ? "ATTACHMENT" : "TEXT",
                    replyToId: replyToData ? parseInt(replyToData.chatMessageId) : null,
                    attachments:
                        attachments && attachments.length > 0
                            ? attachments.map((att) => ({
                                fileURL: att.fileURL,
                                fileType: att.fileType,
                            }))
                            : [],
                };

                const success = sendSocketMessage(
                    chatRoomId,
                    currentUserId,
                    receiverUserId,
                    payload
                );

                if (success) {
                    const pseudoId = `${currentUserId}-${Date.now()}`;
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === newMessage.id
                                ? { ...msg, id: pseudoId, status: "sent" }
                                : msg
                        )
                    );
                } else {
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === newMessage.id ? { ...msg, status: "failed" } : msg
                        )
                    );
                }
            }

            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error("Error sending message with attachments:", error);
            toast.error("Failed to upload files");
        } finally {
            setUploadingFiles(false);
        }
    };

    // Audio recording functions
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: "audio/webm",
                });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioBlob(audioBlob);
                setAudioURL(audioUrl);
                setShowAudioPreview(true);

                // Stop all tracks
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            setShowAttachMenu(false);

            // Start timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            toast.error("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            if (isPaused) {
                mediaRecorderRef.current.resume();
                recordingIntervalRef.current = setInterval(() => {
                    setRecordingTime((prev) => prev + 1);
                }, 1000);
            } else {
                mediaRecorderRef.current.pause();
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                }
            }
            setIsPaused(!isPaused);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream
                .getTracks()
                .forEach((track) => track.stop());
        }
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
        }
    };

    const sendAudioMessage = async () => {
        if (!audioBlob) return;

        setUploadingFiles(true);
        try {
            // Create file from blob
            const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, {
                type: "audio/webm",
            });

            const fileWithPreview = {
                file: audioFile,
                preview: audioURL,
                type: "audio/webm",
                name: audioFile.name,
                size: audioFile.size,
            };

            // Upload to server
            const uploadResult = await uploadFilesToServer([fileWithPreview]);
            const attachments = Array.isArray(uploadResult) ? uploadResult : [];

            const messageText = message.trim() || "";
            const newMessage = {
                id: `temp-${Date.now()}`,
                text: messageText,
                time: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                }),
                isMe: true,
                status: "sending",
                timestamp: new Date().toISOString(),
                senderName: "You",
                senderId: currentUserId,
                receiverId: receiverUserId,
                attachments: attachments.map((att) => ({
                    fileURL: att.fileURL,
                    fileType: att.fileType,
                })),
            };

            setMessages((prev) => [...prev, newMessage]);
            setMessage("");
            setAudioBlob(null);
            setAudioURL(null);
            setShowAudioPreview(false);
            setRecordingTime(0);

            // Send via WebSocket
            if (connected && sendSocketMessage) {
                const payload = {
                    content: messageText,
                    messageType: "ATTACHMENT",
                    replyToId: null,
                    attachments: attachments.map((att) => ({
                        fileURL: att.fileURL,
                        fileType: att.fileType,
                    })),
                };

                const success = sendSocketMessage(
                    chatRoomId,
                    currentUserId,
                    receiverUserId,
                    payload
                );
                if (success) {
                    const pseudoId = `${currentUserId}-${Date.now()}`;
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === newMessage.id
                                ? { ...msg, id: pseudoId, status: "sent" }
                                : msg
                        )
                    );
                }
            }

            setTimeout(() => scrollToBottom(), 100);
        } catch (error) {
            console.error("Error sending audio:", error);
            toast.error("Failed to send audio");
        } finally {
            setUploadingFiles(false);
        }
    };

    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    // Media viewer functions
    const openMediaViewer = (mediaList, startIndex) => {
        setViewerMediaList(mediaList);
        setCurrentMediaIndex(startIndex);
        setShowMediaViewer(true);
    };

    const closeMediaViewer = () => {
        setShowMediaViewer(false);
        setCurrentMediaIndex(0);
        setViewerMediaList([]);
        setImageZoom(1);
        setImagePosition({ x: 0, y: 0 });
    };

    const goToNextMedia = () => {
        setCurrentMediaIndex((prev) => (prev + 1) % viewerMediaList.length);
        setImageZoom(1);
        setImagePosition({ x: 0, y: 0 });
    };

    const goToPrevMedia = () => {
        setCurrentMediaIndex(
            (prev) => (prev - 1 + viewerMediaList.length) % viewerMediaList.length
        );
        setImageZoom(1);
        setImagePosition({ x: 0, y: 0 });
    };

    const getFileIcon = (fileType) => {
        if (!fileType) return <IoDocument className="text-gray-400" />;
        if (fileType.startsWith("image/"))
            return <IoImages className="text-blue-400" />;
        if (fileType.startsWith("audio/"))
            return <IoMusicalNote className="text-purple-400" />;
        if (fileType.startsWith("video/"))
            return <IoPlayCircle className="text-red-400" />;
        if (fileType.includes("pdf"))
            return <IoDocumentText className="text-red-500" />;
        if (fileType.includes("sheet") || fileType.includes("excel"))
            return <IoDocument className="text-green-500" />;
        if (fileType.includes("word") || fileType.includes("document"))
            return <IoDocument className="text-blue-500" />;
        return <IoDocument className="text-gray-400" />;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    // Get publish function from WebSocket
    const { publish } = useWebSocket();

    const handleTextChange = (text) => {
        setMessage(text);

        // Send typing indicator
        if (
            connected &&
            sendTypingIndicator &&
            currentUserId &&
            chatRoomId &&
            receiverUserId
        ) {
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

    const { initiateCall } = useCall();

    const handleCallPress = (isVideo) => {
        console.log("🎯 Call button pressed!");
        console.log("Is Video:", isVideo);
        console.log("Current User ID:", currentUserId);
        console.log("Receiver User ID:", receiverUserId);
        console.log("WebSocket Connected:", connected);

        if (!connected) {
            toast.warning("WebSocket not connected. Please wait and try again.");
            return;
        }

        if (!currentUserId) {
            toast.warning(
                "Please wait for the app to load completely before making a call"
            );
            return;
        }

        console.log("✅ Calling initiateCall...");
        initiateCall(
            {
                id: receiverUserId,
                name: name,
                avatar: avatar,
            },
            isVideo,
            currentUserId
        ); // Pass currentUserId explicitly
        console.log("✅ initiateCall function called");
    };

    // Auto-initiate call if autoCall parameter is present
    useEffect(() => {
        const autoCallType = searchParams.get("autoCall");

        if (autoCallType && currentUserId && connected && receiverUserId) {
            console.log("🎯 Auto-initiating call:", autoCallType);

            // Small delay to ensure everything is loaded
            const timer = setTimeout(() => {
                const isVideo = autoCallType === "video";
                handleCallPress(isVideo);

                // Remove autoCall parameter from URL to prevent re-triggering
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.delete("autoCall");
                navigate(`/chat/${id}?${newSearchParams.toString()}`, {
                    replace: true,
                });
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [currentUserId, connected, receiverUserId, searchParams]);

    // Mark unread messages as read when chat is opened or new messages arrive
    useEffect(() => {
        const markUnreadMessagesAsRead = async () => {
            if (!chatRoomId || !currentUserId || messages.length === 0) return;

            // Find all unread messages that were sent by the other user (not by me)
            const unreadMessages = messages.filter(
                (msg) => !msg.isMe && !msg.isRead && !msg.isSeen && msg.chatMessageId
            );

            if (unreadMessages.length === 0) return;

            const messageIds = unreadMessages.map((msg) => msg.chatMessageId);

            console.log("📖 Marking messages as read:", messageIds);

            try {
                await chatApiService.markMessagesAsRead(
                    chatRoomId,
                    currentUserId,
                    messageIds
                );

                // Update local state to mark these messages as read
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        messageIds.includes(msg.chatMessageId)
                            ? { ...msg, isRead: true, isSeen: true }
                            : msg
                    )
                );

                console.log("✅ Messages marked as read successfully");
            } catch (error) {
                console.error("❌ Error marking messages as read:", error);
            }
        };

        // Mark messages as read after a short delay to ensure user is viewing them
        const timer = setTimeout(() => {
            markUnreadMessagesAsRead();
        }, 1000);

        return () => clearTimeout(timer);
    }, [messages.length, chatRoomId, currentUserId]);

    const scrollToBottom = (instant = false) => {
        console.log("instant", instant);
        const container = messagesContainerRef.current;
        if (!container) return;

        if (instant) {
            // Instant scroll - no animation
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "auto",
            });
        } else {
            // Smooth scroll - with animation
            container.scrollTo({
                top: container.scrollHeight,
                behavior: "smooth",
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

        // Hide "new messages" pill when user reaches bottom
        if (isNearBottom && showNewMessageNotification) {
            setShowNewMessageNotification(false);
            setNewMessageCount(0);
        }

        // Enable load-more again once user has scrolled down a bit from the top
        if (scrollTop > 60 && !canLoadMoreRef.current) {
            canLoadMoreRef.current = true;
        }

        // Load older messages only when user reaches the very top,
        // and only once per "reach top" cycle (avoids repeated triggers from image/layout changes)
        const isAtTop = scrollTop <= 5;
        if (
            isAtTop &&
            hasMoreMessages &&
            !isLoadingMore &&
            !loading &&
            canLoadMoreRef.current
        ) {
            canLoadMoreRef.current = false;

            // Capture the current top message as an anchor so we can restore its
            // position after older messages are prepended.
            let anchorSnapshot = null;
            const containerNow = messagesContainerRef.current;
            if (containerNow && messages.length > 0) {
                const anchorMessage = messages[0]; // top-most message currently loaded
                const anchorEl = document.getElementById(`msg-${anchorMessage.id}`);
                if (anchorEl) {
                    const containerRect = containerNow.getBoundingClientRect();
                    const anchorRect = anchorEl.getBoundingClientRect();
                    anchorSnapshot = {
                        id: anchorMessage.id,
                        offset: anchorRect.top - containerRect.top,
                    };
                }
            }

            const nextPage = currentPage + 1;
            loadChatMessages(nextPage, anchorSnapshot);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-[#1a1a1a] flex flex-col"
            style={{
                paddingTop: "env(safe-area-inset-top)",
                height: isKeyboardOpen ? `${window.innerHeight}px` : '100vh',
                overflow: 'hidden'
            }}
        >
            {/* Header - Absolute positioning to stay at top */}
            <div
                className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 bg-[#1a1a1a] border-b border-gray-800 shadow-lg"
                style={{
                    paddingTop: "max(0.75rem, env(safe-area-inset-top))"
                }}
            >
                <div className="flex items-center flex-1 min-w-0">
                    {/* Back button - 3D ring matching add-friend button */}
                    <button
                        onClick={() => navigate("/chats")}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 mr-2 sm:mr-4 flex-shrink-0"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            <IoArrowBack className="text-white text-lg sm:text-xl" />
                        </div>
                    </button>

                    {/* Chat avatar and info - Clickable */}
                    <button
                        onClick={() =>
                            navigate(
                                `/user-profile/${receiverUserId}?chatRoomId=${chatRoomId}`
                            )
                        }
                        className="flex items-center flex-1 min-w-0 hover:opacity-80 transition-opacity"
                    >
                        {/* Chat avatar - 3D ring around avatar */}
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full mr-2 sm:mr-4 bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_14px_22px_rgba(0,0,0,0.96),0_0_0_1px_rgba(255,255,255,0.14),inset_0_3px_4px_rgba(255,255,255,0.22),inset_0_-4px_7px_rgba(0,0,0,0.95),inset_3px_0_4px_rgba(255,255,255,0.18),inset_-3px_0_4px_rgba(0,0,0,0.8)] border border-black/70 flex-shrink-0 flex items-center justify-center">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#181818] to-[#050505] shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-3px_5px_rgba(0,0,0,0.95)] flex items-center justify-center overflow-hidden">
                                {avatar && decodeURIComponent(avatar) ? (
                                    <img
                                        src={decodeURIComponent(avatar)}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const nameParts = name.split(" ");
                                            const firstInitial =
                                                nameParts[0]?.charAt(0).toUpperCase() || "U";
                                            const lastInitial =
                                                nameParts[1]?.charAt(0).toUpperCase() || "";
                                            e.target.style.display = "none";
                                            e.target.parentElement.innerHTML = `<span class="text-xs font-semibold text-white">${firstInitial}${lastInitial}</span>`;
                                        }}
                                    />
                                ) : (
                                    <span className="text-xs font-semibold text-white">
                                        {(() => {
                                            const nameParts = name.split(" ");
                                            const firstInitial =
                                                nameParts[0]?.charAt(0).toUpperCase() || "U";
                                            const lastInitial =
                                                nameParts[1]?.charAt(0).toUpperCase() || "";
                                            return `${firstInitial}${lastInitial}`;
                                        })()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <h2 className="text-white font-bold text-base sm:text-lg truncate">
                                {name || "Unknown"}
                            </h2>
                            <p className="text-xs sm:text-sm truncate flex items-center">
                                {typingUsers.length > 0 ? (
                                    <span className="text-gray-300 italic">Typing...</span>
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
                    </button>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {/* Video call - 3D ring like add-friend button */}
                    <button
                        onClick={() => handleCallPress(true)}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            <IoVideocam className="text-white text-lg sm:text-xl" />
                        </div>
                    </button>

                    {/* Audio call - 3D ring like add-friend button */}
                    <button
                        onClick={() => handleCallPress(false)}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            <IoCall className="text-white text-lg sm:text-xl" />
                        </div>
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
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto overflow-x-hidden px-3 sm:px-5 scrollbar-hide"
                style={{
                    top: "calc(3.5rem + env(safe-area-inset-top, 0px))",
                    bottom: isKeyboardOpen ? `${keyboardHeight}px` : "5rem",
                    paddingBottom: "1rem",
                }}
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
                    <>
                        {/* Small loader at top when fetching older pages */}
                        {isLoadingMore && hasMoreMessages && (
                            <div className="flex items-center justify-center py-2">
                                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {messages.map((item, index) => {
                            const previousMessage = index > 0 ? messages[index - 1] : null;
                            const showDateSeparator = shouldShowDateSeparator(
                                item,
                                previousMessage
                            );

                            return (
                                <>
                                    {/* Date Separator - simple centered label (no full-width bar) */}
                                    {showDateSeparator && (
                                        <div
                                            key={`date-${item.id}`}
                                            className="flex justify-center my-3"
                                        >
                                            <span className="text-gray-500 text-xs font-medium">
                                                {formatDateSeparator(item.timestamp)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Message */}
                                    <div
                                        key={item.id}
                                        id={`msg-${item.id}`}
                                        className={`flex my-1 sm:my-2 ${item.isMe ? "justify-end" : "justify-start"
                                            } group w-full`}
                                    >
                                        <div
                                            className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%] ${showMessageMenu === item.id ? "z-[99998]" : "z-10"
                                                }`}
                                        >
                                            <div
                                                className={`w-full px-3 sm:px-4 py-2 sm:py-3 rounded-2xl ${item.isDeleted
                                                    ? "bg-gray-800 border border-gray-700 shadow-lg"
                                                    : "bg-gradient-to-b from-white/16 via-white/10 to-white/6  border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding"
                                                    }`}
                                                style={{
                                                    wordBreak: "break-word",
                                                    overflowWrap: "break-word",
                                                }}
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
                                                            <div
                                                                className={`mb-2 pl-2 border-l-2 ${item.isMe
                                                                    ? "border-white border-opacity-50"
                                                                    : "border-red-500"
                                                                    }`}
                                                            >
                                                                <p
                                                                    className={`text-xs font-semibold ${item.isMe
                                                                        ? "text-white opacity-80"
                                                                        : "text-red-400"
                                                                        }`}
                                                                >
                                                                    {item.replyTo.senderName || "Unknown"}
                                                                </p>
                                                                <p
                                                                    className={`text-xs ${item.isMe
                                                                        ? "text-white opacity-70"
                                                                        : "text-gray-400"
                                                                        } truncate`}
                                                                >
                                                                    {item.replyTo.content || "Message"}
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
                                                                        Deleted at{" "}
                                                                        {formatMessageTime(item.deletedAt)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {/* Attachments */}
                                                                {item.attachments &&
                                                                    item.attachments.length > 0 &&
                                                                    (() => {
                                                                        // Separate images/videos from other files
                                                                        const mediaAttachments =
                                                                            item.attachments.filter((att) => {
                                                                                const fileType = att.fileType;
                                                                                return (
                                                                                    fileType &&
                                                                                    (fileType.startsWith("image/") ||
                                                                                        fileType.startsWith("video/"))
                                                                                );
                                                                            });
                                                                        const otherAttachments =
                                                                            item.attachments.filter((att) => {
                                                                                const fileType = att.fileType;
                                                                                return (
                                                                                    fileType &&
                                                                                    !fileType.startsWith("image/") &&
                                                                                    !fileType.startsWith("video/")
                                                                                );
                                                                            });

                                                                        return (
                                                                            <div className="mb-2">
                                                                                {/* Media Grid (Images/Videos) */}
                                                                                {mediaAttachments.length > 0 && (
                                                                                    <div
                                                                                        className={`
                                                                                ${mediaAttachments.length ===
                                                                                                1
                                                                                                ? "w-full max-w-[280px]"
                                                                                                : ""
                                                                                            }
                                                                                ${mediaAttachments.length ===
                                                                                                2
                                                                                                ? "grid grid-cols-2 gap-0.5 max-w-[280px]"
                                                                                                : ""
                                                                                            }
                                                                                ${mediaAttachments.length ===
                                                                                                3
                                                                                                ? "grid grid-cols-2 gap-0.5 max-w-[280px]"
                                                                                                : ""
                                                                                            }
                                                                                ${mediaAttachments.length >=
                                                                                                4
                                                                                                ? "grid grid-cols-2 gap-0.5 max-w-[280px]"
                                                                                                : ""
                                                                                            }
                                                                                rounded-lg overflow-hidden
                                                                            `}
                                                                                    >
                                                                                        {mediaAttachments
                                                                                            .slice(0, 4)
                                                                                            .map((att, idx) => {
                                                                                                const fileUrl =
                                                                                                    att.fileURL || att.fileUrl;
                                                                                                const fileType = att.fileType;
                                                                                                const isLast =
                                                                                                    idx === 3 &&
                                                                                                    mediaAttachments.length > 4;
                                                                                                const remaining =
                                                                                                    mediaAttachments.length - 4;

                                                                                                // Debug logging
                                                                                                if (!fileUrl) {
                                                                                                    console.error(
                                                                                                        "❌ Missing fileUrl for attachment:",
                                                                                                        {
                                                                                                            idx,
                                                                                                            fileType,
                                                                                                            att,
                                                                                                            messageId: item.id,
                                                                                                            messageStatus:
                                                                                                                item.status,
                                                                                                        }
                                                                                                    );
                                                                                                } else {
                                                                                                    console.log(
                                                                                                        "🖼️ Rendering attachment:",
                                                                                                        {
                                                                                                            idx,
                                                                                                            fileUrl:
                                                                                                                fileUrl.substring(
                                                                                                                    0,
                                                                                                                    50
                                                                                                                ) + "...",
                                                                                                            fileType,
                                                                                                        }
                                                                                                    );
                                                                                                }

                                                                                                // Prepare media list for viewer
                                                                                                const mediaList =
                                                                                                    mediaAttachments.map((a) => ({
                                                                                                        url: a?.fileURL,
                                                                                                        type: a?.fileType,
                                                                                                    }));

                                                                                                return (
                                                                                                    <div
                                                                                                        key={idx}
                                                                                                        className={`
                                                                                                relative overflow-hidden
                                                                                                ${mediaAttachments.length ===
                                                                                                                1
                                                                                                                ? "h-[200px]"
                                                                                                                : ""
                                                                                                            }
                                                                                                ${mediaAttachments.length ===
                                                                                                                2
                                                                                                                ? "h-[140px]"
                                                                                                                : ""
                                                                                                            }
                                                                                                ${mediaAttachments.length ===
                                                                                                                3 &&
                                                                                                                idx ===
                                                                                                                0
                                                                                                                ? "row-span-2 h-[280px]"
                                                                                                                : "h-[140px]"
                                                                                                            }
                                                                                                ${mediaAttachments.length >=
                                                                                                                4
                                                                                                                ? "h-[140px]"
                                                                                                                : ""
                                                                                                            }
                                                                                            `}
                                                                                                    >
                                                                                                        {!fileUrl ? (
                                                                                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                                                                                <span className="text-gray-400 text-xs">
                                                                                                                    Loading...
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ) : fileType.startsWith(
                                                                                                            "image/"
                                                                                                        ) ? (
                                                                                                            <img
                                                                                                                src={fileUrl}
                                                                                                                alt="attachment"
                                                                                                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                                                                                crossOrigin="anonymous"
                                                                                                                loading="lazy"
                                                                                                                onClick={() =>
                                                                                                                    openMediaViewer(
                                                                                                                        mediaList,
                                                                                                                        idx
                                                                                                                    )
                                                                                                                }
                                                                                                                onError={(e) => {
                                                                                                                    console.error(
                                                                                                                        "❌ Image load error:",
                                                                                                                        fileUrl
                                                                                                                    );

                                                                                                                    // Retry loading the image after a delay
                                                                                                                    const retryCount = parseInt(e.target.dataset.retryCount || '0');
                                                                                                                    if (retryCount < 3) {
                                                                                                                        console.log(`🔄 Retrying image load (attempt ${retryCount + 1}/3)...`);
                                                                                                                        e.target.dataset.retryCount = (retryCount + 1).toString();

                                                                                                                        // Retry after delay (1s, 2s, 3s)
                                                                                                                        setTimeout(() => {
                                                                                                                            e.target.src = fileUrl + '?t=' + Date.now(); // Add cache buster
                                                                                                                        }, (retryCount + 1) * 1000);
                                                                                                                    } else {
                                                                                                                        // After 3 retries, show error placeholder
                                                                                                                        console.error('❌ Image failed to load after 3 retries');
                                                                                                                        e.target.style.display = "none";
                                                                                                                        // Show error message in parent
                                                                                                                        const parent = e.target.parentElement;
                                                                                                                        if (parent) {
                                                                                                                            parent.innerHTML = '<div class="w-full h-full bg-gray-800 flex items-center justify-center"><span class="text-gray-400 text-xs">Failed to load image</span></div>';
                                                                                                                        }
                                                                                                                    }
                                                                                                                }}
                                                                                                                onLoad={() => {
                                                                                                                    console.log(
                                                                                                                        "✅ Image loaded successfully:",
                                                                                                                        fileUrl
                                                                                                                    );
                                                                                                                }}
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <div
                                                                                                                className="relative w-full h-full cursor-pointer group"
                                                                                                                onClick={() =>
                                                                                                                    openMediaViewer(
                                                                                                                        mediaList,
                                                                                                                        idx
                                                                                                                    )
                                                                                                                }
                                                                                                            >
                                                                                                                <video
                                                                                                                    src={fileUrl}
                                                                                                                    className="w-full h-full object-cover pointer-events-none"
                                                                                                                    onError={(e) => {
                                                                                                                        console.error(
                                                                                                                            "Video load error:",
                                                                                                                            fileUrl
                                                                                                                        );
                                                                                                                    }}
                                                                                                                />
                                                                                                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all">
                                                                                                                    <IoPlayCircle className="text-white text-5xl group-hover:scale-110 transition-transform" />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}

                                                                                                        {/* Show +N overlay on 4th image if more than 4 */}
                                                                                                        {isLast && (
                                                                                                            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                                                                                                <span className="text-white text-4xl font-bold">
                                                                                                                    +{remaining}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                    </div>
                                                                                )}

                                                                                {/* Other Attachments (Audio, Documents, etc.) */}
                                                                                {otherAttachments.length > 0 && (
                                                                                    <div
                                                                                        className={`space-y-2 ${mediaAttachments.length > 0
                                                                                            ? "mt-2"
                                                                                            : ""
                                                                                            }`}
                                                                                    >
                                                                                        {otherAttachments.map(
                                                                                            (att, idx) => {
                                                                                                const fileUrl =
                                                                                                    att.fileURL || att.fileUrl;
                                                                                                const fileType = att.fileType;

                                                                                                if (!fileUrl) return null;

                                                                                                return (
                                                                                                    <div key={idx}>
                                                                                                        {fileType.startsWith(
                                                                                                            "audio/"
                                                                                                        ) ? (
                                                                                                            <WhatsAppAudioPlayer
                                                                                                                audioUrl={fileUrl}
                                                                                                                isMe={item.isMe}
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <a
                                                                                                                href={fileUrl}
                                                                                                                target="_blank"
                                                                                                                rel="noopener noreferrer"
                                                                                                                className={`flex items-center gap-2 p-3 rounded-lg ${item.isMe
                                                                                                                    ? "bg-white bg-opacity-10"
                                                                                                                    : "bg-gray-700"
                                                                                                                    } hover:opacity-80 transition-opacity`}
                                                                                                            >
                                                                                                                <span className="text-2xl">
                                                                                                                    {getFileIcon(
                                                                                                                        fileType
                                                                                                                    )}
                                                                                                                </span>
                                                                                                                <div className="flex-1 min-w-0">
                                                                                                                    <p className="text-sm text-white truncate">
                                                                                                                        {fileUrl
                                                                                                                            .split("/")
                                                                                                                            .pop()}
                                                                                                                    </p>
                                                                                                                    <p className="text-xs text-gray-400">
                                                                                                                        {fileType || "File"}
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                            </a>
                                                                                                        )}
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                {/* Text message */}
                                                                {item.text && (
                                                                    <p
                                                                        className={`text-sm sm:text-base leading-relaxed whitespace-pre-wrap ${item.isMe ? "text-white" : "text-white"
                                                                            }`}
                                                                        style={{
                                                                            wordBreak: "break-word",
                                                                            overflowWrap: "break-word",
                                                                        }}
                                                                    >
                                                                        {item.text}
                                                                    </p>
                                                                )}
                                                            </>
                                                        )}
                                                        {item.isEncrypted && !item.isDeleted && (
                                                            <IoLockClosed
                                                                className={`ml-2 mt-1 text-xs flex-shrink-0 ${item.isMe
                                                                    ? "text-white opacity-70"
                                                                    : "text-gray-400"
                                                                    }`}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Three-dot menu (show for all messages except temp ones) */}
                                                    {!item.isDeleted &&
                                                        !item.id.toString().startsWith("temp-") && (
                                                            <div
                                                                className={`ml-2 flex-shrink-0 relative ${showMessageMenu === item.id
                                                                    ? "z-[99999]"
                                                                    : "z-[9998]"
                                                                    } message-menu`}
                                                            >
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowMessageMenu(
                                                                            showMessageMenu === item.id
                                                                                ? null
                                                                                : item.id
                                                                        );
                                                                    }}
                                                                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-opacity"
                                                                    title="Options"
                                                                >
                                                                    <IoEllipsisVertical className="text-white text-base" />
                                                                </button>

                                                                {/* Dropdown menu */}
                                                                {showMessageMenu === item.id && (
                                                                    <div
                                                                        className={`absolute top-8 bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_2px_4px_rgba(255,255,255,0.22),inset_0_-3px_6px_rgba(0,0,0,0.92)] backdrop-blur-2xl bg-clip-padding z-[9999] min-w-[180px] ${item.isMe ? "right-0" : "left-0"
                                                                            }`}
                                                                    >
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                copyMessageText(item.text);
                                                                            }}
                                                                            className="w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 flex items-center gap-3 rounded-t-2xl"
                                                                        >
                                                                            <IoCopyOutline className="text-base" />
                                                                            <span className="text-sm">Copy</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                startReplyMessage(item);
                                                                            }}
                                                                            className={`w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 flex items-center gap-3 ${item.isMe ? "" : "rounded-b-2xl"
                                                                                }`}
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
                                                                                    className="w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 flex items-center gap-3"
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
                                                                                    className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-900/40 flex items-center gap-3 rounded-b-2xl"
                                                                                    title="Delete"
                                                                                >
                                                                                    <IoTrashOutline className="text-base" />
                                                                                    <span className="text-sm">
                                                                                        Delete
                                                                                    </span>
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
                                                        <p
                                                            className={`text-xs ${item.isMe
                                                                ? "text-white opacity-70"
                                                                : "text-gray-400"
                                                                }`}
                                                        >
                                                            {item.time}
                                                        </p>
                                                        {item.isEdited && !item.isDeleted && (
                                                            <span
                                                                className={`text-xs italic ${item.isMe
                                                                    ? "text-white opacity-60"
                                                                    : "text-gray-500"
                                                                    }`}
                                                            >
                                                                (edited)
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Read receipts for sent messages */}
                                                    {item.isMe && !item.isDeleted && (
                                                        <div className="ml-2 flex items-center">
                                                            {item.isRead ||
                                                                item.status === "read" ||
                                                                item.isSeen ? (
                                                                // Double tick - BLUE (Read/Seen by receiver)
                                                                <IoCheckmarkDone
                                                                    className="text-[#4FC3F7] text-base"
                                                                    title="Read"
                                                                />
                                                            ) : item.status === "sending" ? (
                                                                // Single tick - Gray (Sending)
                                                                <IoCheckmark
                                                                    className="text-gray-300 text-base animate-pulse"
                                                                    title="Sending"
                                                                />
                                                            ) : (
                                                                // Double tick - Gray (Delivered but not read)
                                                                <IoCheckmarkDone
                                                                    className="text-gray-400 text-base"
                                                                    title="Delivered"
                                                                />
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
            {isUserScrolledUp && (
                <button
                    onClick={() => scrollToBottom(false)}
                    className="absolute bottom-24 sm:bottom-28 right-4 sm:right-6 w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 z-50 transition-transform hover:scale-105"
                >
                    <div
                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)] ${newMessageCount > 0
                            ? "bg-gradient-to-b from-[#0a84ff] to-[#0040dd]"
                            : "bg-gradient-to-b from-[#3a3a3a] to-[#111111]"
                            }`}
                    >
                        <IoArrowDown className="text-white text-xl" />
                    </div>
                </button>
            )}

            {/* Message Input - Absolute at bottom */}
            <div
                className="absolute left-0 right-0 z-50 bg-[#1a1a1a] px-3 sm:px-5 py-3 sm:py-4 border-t border-gray-800 shadow-lg"
                style={{
                    bottom: isKeyboardOpen ? `${keyboardHeight}px` : 0,
                    paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))"
                }}
            >
                {/* Edit Mode Indicator */}
                {editingMessageId && (
                    <div className="mb-2 flex items-center justify-between bg-[#2d2d2d] px-3 py-2 rounded-lg border border-gray-700">
                        <div className="flex items-center gap-2">
                            <IoCreateOutline className="text-gray-300 text-lg" />
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
                                    <span className="text-xs text-gray-400">
                                        Replying to {replyingToMessage.senderName}
                                    </span>
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

                    {/* Emoji + input container with glassy/search-bar style */}
                    <div className="flex-1 flex items-center rounded-full px-3 sm:px-5 py-2 sm:py-3 bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding gap-2">
                        <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 flex-shrink-0"
                        >
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                <IoHappyOutline className="text-gray-300 text-base sm:text-lg" />
                            </div>
                        </button>

                        <textarea
                            ref={textInputRef}
                            value={message}
                            onChange={(e) => handleTextChange(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={
                                editingMessageId ? "Edit your message" : "Type a message"
                            }
                            className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 text-left outline-none resize-none text-sm sm:text-base leading-relaxed min-h-[32px] sm:min-h-[36px] py-1.5 sm:py-2"
                            rows={1}
                        />
                    </div>

                    {!editingMessageId && (
                        <>
                            <div className="relative attach-menu-container">
                                <button
                                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 flex-shrink-0 transition-transform hover:scale-105"
                                >
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                        <IoAttach className="text-gray-200 text-lg sm:text-xl" />
                                    </div>
                                </button>

                                {/* Attach Menu */}
                                {showAttachMenu && (
                                    <div className="absolute bottom-16 right-0 sm:right-2 bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 rounded-2xl shadow-[0_16px_32px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_2px_4px_rgba(255,255,255,0.22),inset_0_-3px_6px_rgba(0,0,0,0.92)] backdrop-blur-2xl bg-clip-padding z-50 min-w-[180px]">
                                        <button
                                            onClick={() => {
                                                openCamera();
                                                setShowAttachMenu(false);
                                            }}
                                            className="w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 flex items-center gap-3 rounded-t-2xl"
                                        >
                                            <IoCamera className="text-xl text-gray-300" />
                                            <span className="text-sm">Camera</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                console.log("📷 Photos button clicked");
                                                setShowAttachMenu(false);
                                                setTimeout(() => {
                                                    console.log("📷 Triggering photo input click");
                                                    if (photoInputRef.current) {
                                                        // Reset value first
                                                        photoInputRef.current.value = "";
                                                        // Trigger click
                                                        photoInputRef.current.click();
                                                        console.log("📷 Photo input clicked");
                                                    } else {
                                                        console.error("❌ Photo input ref not found");
                                                    }
                                                }, 150);
                                            }}
                                            className="w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 flex items-center gap-3"
                                        >
                                            <IoImages className="text-xl text-green-400" />
                                            <span className="text-sm">Photos</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                console.log("📁 Files button clicked");
                                                setShowAttachMenu(false);
                                                setTimeout(() => {
                                                    console.log("📁 Triggering file input click");
                                                    if (fileInputRef.current) {
                                                        // Reset value first
                                                        fileInputRef.current.value = "";
                                                        // Trigger click
                                                        fileInputRef.current.click();
                                                        console.log("📁 File input clicked");
                                                    } else {
                                                        console.error("❌ File input ref not found");
                                                    }
                                                }, 150);
                                            }}
                                            className="w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 flex items-center gap-3"
                                        >
                                            <IoDocument className="text-xl text-purple-400" />
                                            <span className="text-sm">Files</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                startRecording();
                                                setShowAttachMenu(false);
                                            }}
                                            className="w-full px-4 py-3 text-left text-white/90 hover:bg-white/10 flex items-center gap-3 rounded-b-2xl"
                                        >
                                            <IoMic className="text-xl text-red-400" />
                                            <span className="text-sm">Audio</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Hidden file inputs */}
                            {/* File input - for documents and all files */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={(e) => handleFileSelect(e, "file")}
                                className="hidden"
                                accept="*/*"
                                style={{
                                    display: "none",
                                    position: "absolute",
                                    left: "-9999px",
                                }}
                                onClick={(e) => {
                                    // Reset value to allow selecting same file again
                                    e.target.value = null;
                                    console.log("📁 File input clicked");
                                }}
                            />
                            {/* Photo/Video input - optimized for mobile camera/gallery */}
                            <input
                                ref={photoInputRef}
                                type="file"
                                multiple
                                onChange={(e) => handleFileSelect(e, "photo")}
                                className="hidden"
                                accept="image/*,video/*"
                                style={{
                                    display: "none",
                                    position: "absolute",
                                    left: "-9999px",
                                }}
                                onClick={(e) => {
                                    // Reset value to allow selecting same file again
                                    e.target.value = null;
                                    console.log("📷 Photo input clicked");
                                }}
                            />
                        </>
                    )}

                    <button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 flex-shrink-0 transition-transform ${message.trim()
                            ? "hover:scale-105"
                            : "opacity-40 cursor-not-allowed"
                            }`}
                    >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            {editingMessageId ? (
                                <IoCheckmarkCircle
                                    className={`text-lg sm:text-xl ${message.trim() ? "text-[#34c759]" : "text-gray-500"
                                        }`}
                                />
                            ) : (
                                <IoSend
                                    className={`text-lg sm:text-xl ${message.trim() ? "text-[#34c759]" : "text-gray-500"
                                        }`}
                                />
                            )}
                        </div>
                    </button>
                </div>
            </div>

            {/* File Preview Modal */}
            {showFilePreview && (
                <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
                    {/* Header with safe area */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-gray-700 safe-area-top">
                        <h3 className="text-white text-lg font-semibold">
                            {selectedFiles.length}{" "}
                            {selectedFiles.length === 1 ? "File" : "Files"} Selected
                        </h3>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("Close button clicked - closing file preview");
                                setShowFilePreview(false);
                                setSelectedFiles([]);
                            }}
                            className="w-10 h-10 flex items-center justify-center hover:bg-gray-700 rounded-full transition-colors z-10"
                            type="button"
                        >
                            <IoClose className="text-white text-2xl" />
                        </button>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="relative group">
                                    {/* Remove button */}
                                    <button
                                        onClick={() => removeSelectedFile(index)}
                                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                        <IoClose className="text-white text-sm" />
                                    </button>

                                    {/* File preview */}
                                    <div className="bg-[#2d2d2d] rounded-lg overflow-hidden border border-gray-700">
                                        {file.type.startsWith("image/") ? (
                                            <img
                                                src={file.preview}
                                                alt={file.name}
                                                className="w-full h-32 object-cover"
                                            />
                                        ) : file.type.startsWith("video/") ? (
                                            <div className="relative w-full h-32 bg-gray-800 flex items-center justify-center">
                                                <IoPlayCircle className="text-white text-4xl" />
                                                <video
                                                    src={file.preview}
                                                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-32 flex flex-col items-center justify-center gap-2">
                                                {getFileIcon(file.type)}
                                                <span className="text-xs text-gray-400">
                                                    {file.type.includes("pdf")
                                                        ? "PDF"
                                                        : file.type.includes("word")
                                                            ? "DOC"
                                                            : file.type.includes("excel")
                                                                ? "XLS"
                                                                : "FILE"}
                                                </span>
                                            </div>
                                        )}

                                        {/* File info */}
                                        <div className="p-2">
                                            <p className="text-white text-xs truncate">{file.name}</p>
                                            <p className="text-gray-400 text-xs">
                                                {formatFileSize(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Caption Input */}
                    <div className="bg-[#1a1a1a] border-t border-gray-700 p-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Add a caption..."
                                className="flex-1 bg-[#2d2d2d] border border-gray-700 rounded-full px-4 py-2 text-white placeholder-gray-500 outline-none"
                            />
                            <button
                                onClick={sendMessageWithAttachments}
                                disabled={uploadingFiles}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${uploadingFiles
                                    ? "bg-gray-600 cursor-not-allowed"
                                    : "bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 hover:from-[#2a2a2a] hover:to-[#151515]"
                                    }`}
                            >
                                {uploadingFiles ? (
                                    <IoCloudUploadOutline className="text-white text-xl animate-pulse" />
                                ) : (
                                    <IoSend className="text-white text-xl" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recording UI */}
            {isRecording && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-gray-700 p-4 z-50 shadow-2xl">
                    <div className="flex items-center justify-between max-w-2xl mx-auto">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {/* Recording indicator - neumorphic style with pulsing animation */}
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 animate-pulse">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                        <IoMic className="text-white text-xl" />
                                    </div>
                                </div>
                                {isPaused && (
                                    <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-full flex items-center justify-center">
                                        <IoPause className="text-white text-xl" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-white font-semibold">
                                    {isPaused ? "Paused" : "Recording..."}
                                </p>
                                <p className="text-gray-300 text-lg font-mono">
                                    {formatRecordingTime(recordingTime)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Pause/Resume button */}
                            <button
                                onClick={pauseRecording}
                                className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 hover:from-[#2a2a2a] hover:to-[#151515] transition-all"
                                title={isPaused ? "Resume" : "Pause"}
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                    {isPaused ? (
                                        <IoPlay className="text-white text-base" />
                                    ) : (
                                        <IoPause className="text-white text-base" />
                                    )}
                                </div>
                            </button>

                            {/* Cancel button */}
                            <button
                                onClick={cancelRecording}
                                className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 hover:from-[#2a2a2a] hover:to-[#151515] transition-all"
                                title="Cancel"
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                    <IoClose className="text-white text-lg" />
                                </div>
                            </button>

                            {/* Stop & Send button */}
                            <button
                                onClick={stopRecording}
                                className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 hover:from-[#2a2a2a] hover:to-[#151515] transition-all"
                                title="Stop & Send"
                            >
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                    <IoStop className="text-white text-lg" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audio Preview Modal */}
            {showAudioPreview && audioURL && (
                <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
                    {/* Header with safe area */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border-b border-gray-700 safe-area-top">
                        <h3 className="text-white text-lg font-semibold">
                            Audio Recording
                        </h3>
                        <button
                            onClick={() => {
                                setShowAudioPreview(false);
                                setAudioBlob(null);
                                setAudioURL(null);
                                setRecordingTime(0);
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded-full"
                        >
                            <IoClose className="text-white text-2xl" />
                        </button>
                    </div>

                    {/* Audio Preview */}
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="bg-[#2d2d2d] rounded-2xl p-8 border border-gray-700 shadow-2xl max-w-md w-full">
                            <div className="flex flex-col items-center gap-6">
                                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70">
                                    <IoMusicalNote className="text-white text-5xl" />
                                </div>

                                <div className="text-center">
                                    <p className="text-white text-lg font-semibold">
                                        Audio Message
                                    </p>
                                    <p className="text-gray-400 text-sm">
                                        {formatRecordingTime(recordingTime)}
                                    </p>
                                </div>

                                <audio
                                    ref={audioPreviewRef}
                                    src={audioURL}
                                    controls
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Send Button */}
                    <div className="bg-[#1a1a1a] border-t border-gray-700 p-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Add a caption..."
                                className="flex-1 bg-[#2d2d2d] border border-gray-700 rounded-full px-4 py-2 text-white placeholder-gray-500 outline-none"
                            />
                            <button
                                onClick={sendAudioMessage}
                                disabled={uploadingFiles}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${uploadingFiles
                                    ? "bg-gray-600 cursor-not-allowed"
                                    : "bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 hover:from-[#2a2a2a] hover:to-[#151515]"
                                    }`}
                            >
                                {uploadingFiles ? (
                                    <IoCloudUploadOutline className="text-white text-xl animate-pulse" />
                                ) : (
                                    <IoSend className="text-white text-xl" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Modal */}
            {showCamera && (
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
                            style={{
                                transform: cameraFacingMode === "user" ? "scaleX(-1)" : "none",
                            }}
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
            )}

            {/* Media Viewer Modal */}
            {showMediaViewer && viewerMediaList.length > 0 && (
                <div
                    className="fixed inset-0 bg-black z-[60] flex flex-col"
                    style={{ paddingTop: "env(safe-area-inset-top)" }}
                >
                    {/* Header with safe area */}
                    <div
                        className="flex items-center justify-between px-4 py-3 bg-black bg-opacity-50"
                        style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
                    >
                        <button
                            onClick={closeMediaViewer}
                            className="w-10 h-10 flex items-center justify-center hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
                        >
                            <IoClose className="text-white text-2xl" />
                        </button>
                        <span className="text-white text-sm">
                            {currentMediaIndex + 1} / {viewerMediaList.length}
                        </span>
                        <button
                            onClick={async () => {
                                const currentMedia = viewerMediaList[currentMediaIndex];
                                if (currentMedia?.url) {
                                    try {
                                        // For mobile, fetch and download
                                        const response = await fetch(currentMedia.url);
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.href = url;
                                        link.download = `slink_${Date.now()}.${currentMedia.type.split("/")[1] || "jpg"
                                            }`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                        toast.success("Image downloaded!");
                                    } catch (error) {
                                        console.error("Download error:", error);
                                        toast.error("Failed to download image");
                                    }
                                }
                            }}
                            className="w-10 h-10 flex items-center justify-center hover:bg-white hover:bg-opacity-10 rounded-full transition-colors"
                            title="Download"
                        >
                            <IoDownload className="text-white text-2xl" />
                        </button>
                    </div>

                    {/* Media Display */}
                    <div
                        className="flex-1 relative flex items-center justify-center overflow-hidden"
                        onDoubleClick={() => {
                            if (
                                viewerMediaList[currentMediaIndex]?.type.startsWith("image/")
                            ) {
                                if (imageZoom === 1) {
                                    setImageZoom(2);
                                } else {
                                    setImageZoom(1);
                                    setImagePosition({ x: 0, y: 0 });
                                }
                            }
                        }}
                        onWheel={(e) => {
                            if (
                                viewerMediaList[currentMediaIndex]?.type.startsWith("image/")
                            ) {
                                e.preventDefault();
                                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                                setImageZoom((prev) => Math.min(Math.max(1, prev + delta), 4));
                            }
                        }}
                    >
                        {viewerMediaList[currentMediaIndex]?.type.startsWith("image/") ? (
                            <img
                                ref={imageRef}
                                src={viewerMediaList[currentMediaIndex]?.url}
                                alt="media"
                                className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-move"
                                style={{
                                    transform: `scale(${imageZoom}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                                }}
                                draggable={false}
                                onMouseDown={(e) => {
                                    if (imageZoom > 1) {
                                        e.preventDefault();
                                        const startX = e.clientX - imagePosition.x;
                                        const startY = e.clientY - imagePosition.y;

                                        const handleMouseMove = (moveEvent) => {
                                            setImagePosition({
                                                x: moveEvent.clientX - startX,
                                                y: moveEvent.clientY - startY,
                                            });
                                        };

                                        const handleMouseUp = () => {
                                            document.removeEventListener(
                                                "mousemove",
                                                handleMouseMove
                                            );
                                            document.removeEventListener("mouseup", handleMouseUp);
                                        };

                                        document.addEventListener("mousemove", handleMouseMove);
                                        document.addEventListener("mouseup", handleMouseUp);
                                    }
                                }}
                                onTouchStart={(e) => {
                                    if (e.touches.length === 2) {
                                        // Pinch zoom
                                        const touch1 = e.touches[0];
                                        const touch2 = e.touches[1];
                                        const distance = Math.hypot(
                                            touch2.clientX - touch1.clientX,
                                            touch2.clientY - touch1.clientY
                                        );
                                        imageRef.current.dataset.initialDistance = distance;
                                        imageRef.current.dataset.initialZoom = imageZoom;
                                    } else if (imageZoom > 1) {
                                        // Pan
                                        const touch = e.touches[0];
                                        imageRef.current.dataset.startX =
                                            touch.clientX - imagePosition.x;
                                        imageRef.current.dataset.startY =
                                            touch.clientY - imagePosition.y;
                                    }
                                }}
                                onTouchMove={(e) => {
                                    if (e.touches.length === 2) {
                                        // Pinch zoom
                                        e.preventDefault();
                                        const touch1 = e.touches[0];
                                        const touch2 = e.touches[1];
                                        const distance = Math.hypot(
                                            touch2.clientX - touch1.clientX,
                                            touch2.clientY - touch1.clientY
                                        );
                                        const initialDistance = parseFloat(
                                            imageRef.current.dataset.initialDistance
                                        );
                                        const initialZoom = parseFloat(
                                            imageRef.current.dataset.initialZoom
                                        );
                                        const scale = distance / initialDistance;
                                        setImageZoom(Math.min(Math.max(1, initialZoom * scale), 4));
                                    } else if (imageZoom > 1 && e.touches.length === 1) {
                                        // Pan
                                        const touch = e.touches[0];
                                        const startX = parseFloat(imageRef.current.dataset.startX);
                                        const startY = parseFloat(imageRef.current.dataset.startY);
                                        setImagePosition({
                                            x: touch.clientX - startX,
                                            y: touch.clientY - startY,
                                        });
                                    }
                                }}
                            />
                        ) : (
                            <video
                                src={viewerMediaList[currentMediaIndex]?.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-full"
                            />
                        )}

                        {/* Navigation Arrows */}
                        {viewerMediaList.length > 1 && (
                            <>
                                <button
                                    onClick={goToPrevMedia}
                                    className="absolute left-4 w-12 h-12 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full flex items-center justify-center transition-all"
                                >
                                    <IoArrowBack className="text-white text-2xl" />
                                </button>
                                <button
                                    onClick={goToNextMedia}
                                    className="absolute right-4 w-12 h-12 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full flex items-center justify-center transition-all"
                                >
                                    <IoArrowBack className="text-white text-2xl transform rotate-180" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Thumbnail Strip */}
                    {viewerMediaList.length > 1 && (
                        <div className="bg-black bg-opacity-50 p-4 overflow-x-auto">
                            <div className="flex gap-2 justify-center">
                                {viewerMediaList.map((media, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentMediaIndex(idx)}
                                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === currentMediaIndex
                                            ? "border-white scale-110"
                                            : "border-transparent opacity-60"
                                            }`}
                                    >
                                        {media.type.startsWith("image/") ? (
                                            <img
                                                src={media.url}
                                                alt={`thumb-${idx}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                <IoPlayCircle className="text-white text-2xl" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Delete Message Confirmation Dialog */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Delete Message"
                    message="Are you sure you want to delete this message? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    type="danger"
                    onConfirm={confirmDeleteMessage}
                    onCancel={cancelDeleteMessage}
                />
            )}
        </div>
    );
}
