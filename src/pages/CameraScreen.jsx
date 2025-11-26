import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IoClose,
    IoFlashOutline,
    IoFlashOffOutline,
    IoCameraReverse,
    IoRadioButtonOn,
    IoStopCircle,
    IoSend,
    IoCheckmark,
    IoRefresh
} from 'react-icons/io5';
import { ApiUtils } from '../services/AuthService';
import chatApiService from '../services/ChatApiService';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from '../contexts/ToastContext';

export default function CameraScreen() {
    const navigate = useNavigate();
    const socket = useWebSocket();
    const toast = useToast();
    const videoRef = useRef(null);
    const previewVideoRef = useRef(null); // Ref for preview video
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);

    const [facingMode, setFacingMode] = useState('user'); // 'user' = front, 'environment' = back
    const [flashEnabled, setFlashEnabled] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mode, setMode] = useState('photo'); // 'photo' or 'video'
    const [capturedMedia, setCapturedMedia] = useState(null);
    const [mediaType, setMediaType] = useState(null); // 'photo' or 'video'
    const [showChatList, setShowChatList] = useState(false);
    const [chatRooms, setChatRooms] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [sending, setSending] = useState(false);

    // Initialize camera
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
        };
    }, [facingMode]);

    // Recording timer
    useEffect(() => {
        let interval;
        if (isRecording) {
            interval = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else {
            setRecordingTime(0);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    // Pause/resume video preview when chat list opens/closes
    useEffect(() => {
        if (previewVideoRef.current && mediaType === 'video') {
            if (showChatList) {
                previewVideoRef.current.pause();
            }
        }
    }, [showChatList, mediaType]);

    const startCamera = async () => {
        try {
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: mode === 'video'
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            toast.error('Failed to access camera. Please check permissions.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const flipCamera = () => {
        setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    };

    const toggleFlash = () => {
        setFlashEnabled((prev) => !prev);
        // Note: Flash control requires advanced camera API
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            if (capabilities.torch) {
                videoTrack.applyConstraints({
                    advanced: [{ torch: !flashEnabled }]
                });
            }
        }
    };

    const switchMode = () => {
        setMode((prev) => (prev === 'photo' ? 'video' : 'photo'));
    };

    const takePhoto = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            setCapturedMedia({ blob, url });
            setMediaType('photo');
            stopCamera();
        }, 'image/jpeg', 0.95);
    };

    const startRecording = async () => {
        try {
            // Restart camera with audio for video recording
            stopCamera();
            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            chunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setCapturedMedia({ blob, url });
                setMediaType('video');
                stopCamera();
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            toast.error('Failed to start recording');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleCapture = () => {
        if (mode === 'photo') {
            takePhoto();
        } else {
            if (isRecording) {
                stopRecording();
            } else {
                startRecording();
            }
        }
    };

    const retake = () => {
        if (capturedMedia) {
            URL.revokeObjectURL(capturedMedia.url);
        }
        setCapturedMedia(null);
        setMediaType(null);
        startCamera();
    };

    const loadChatRooms = async () => {
        try {
            const userId = await ApiUtils.getCurrentUserId();
            if (!userId) {
                toast.error('User not logged in');
                return;
            }

            const response = await chatApiService.getAllChatRooms(userId, {
                pageNumber: 1,
                size: 50,
                sortBy: 'createdAt',
                sortDirection: 'desc',
            });

            const roomsData = Array.isArray(response?.data) ? response.data : [];

            const transformedRooms = roomsData.map((room) => {
                const isCurrentUserUser1 = room.userId === userId;
                const otherUserName = isCurrentUserUser1 ? room.user2Name : room.username;
                const otherUserId = isCurrentUserUser1 ? room.user2Id : room.userId;
                const otherUserProfileURL = isCurrentUserUser1 ? room.user2ProfileURL : room.userProfileURL;

                return {
                    chatRoomId: room.chatRoomId,
                    name: otherUserName || 'Unknown User',
                    avatar: otherUserProfileURL || null,
                    receiverId: otherUserId,
                };
            });

            setChatRooms(transformedRooms);
        } catch (error) {
            console.error('Error loading chat rooms:', error);
        }
    };

    const handleSendClick = () => {
        // Pause video preview when opening chat list
        if (previewVideoRef.current && mediaType === 'video') {
            previewVideoRef.current.pause();
        }
        loadChatRooms();
        setShowChatList(true);
    };

    const handleChatSelect = (chat) => {
        setSelectedChat(chat);
    };

    const sendMedia = async () => {
        if (!selectedChat || !capturedMedia) return;

        try {
            setSending(true);
            const userId = await ApiUtils.getCurrentUserId();

            // Create FormData for file upload
            const formData = new FormData();
            const fileExtension = mediaType === 'photo' ? 'jpg' : 'webm';
            const fileName = `${mediaType}_${Date.now()}.${fileExtension}`;
            formData.append('files', capturedMedia.blob, fileName);

            // Upload file
            const uploadedFiles = await chatApiService.uploadFiles(formData);

            if (!uploadedFiles || uploadedFiles.length === 0) {
                throw new Error('File upload failed');
            }

            // Send message with attachment via WebSocket
            if (socket.connected && socket.sendMessage) {
                const payload = {
                    content: '',
                    messageType: mediaType === 'photo' ? 'IMAGE' : 'VIDEO',
                    attachments: uploadedFiles.map((file) => ({
                        fileURL: file.fileURL,
                        fileType: file.fileType,
                    })),
                };

                const success = socket.sendMessage(
                    selectedChat.chatRoomId,
                    userId,
                    selectedChat.receiverId,
                    payload
                );

                if (success) {
                    toast.success(`${mediaType === 'photo' ? 'Photo' : 'Video'} sent successfully!`);
                    navigate('/chats');
                } else {
                    throw new Error('Failed to send via WebSocket');
                }
            } else {
                throw new Error('WebSocket not connected');
            }
        } catch (error) {
            console.error('Error sending media:', error);
            toast.error('Failed to send media. Please try again.');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="h-screen bg-[#1a1a1a] flex flex-col overflow-hidden safe-area-top">
            {/* Camera View or Preview */}
            {!capturedMedia ? (
                <>
                    {/* Video Stream */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />

                    {/* Top Controls */}
                    <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-10">
                        <button
                            onClick={() => navigate('/chats')}
                            className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
                        >
                            <IoClose className="text-white text-2xl" />
                        </button>

                        <button
                            onClick={toggleFlash}
                            className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
                        >
                            {flashEnabled ? (
                                <IoFlashOutline className="text-yellow-400 text-2xl" />
                            ) : (
                                <IoFlashOffOutline className="text-white text-2xl" />
                            )}
                        </button>
                    </div>

                    {/* Recording Timer */}
                    {isRecording && (
                        <div className="absolute top-20 left-0 right-0 flex justify-center z-10">
                            <div className="px-4 py-2 rounded-full bg-red-600 flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                                <span className="text-white font-semibold">{formatTime(recordingTime)}</span>
                            </div>
                        </div>
                    )}

                    {/* Bottom Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center gap-4 z-10">
                        {/* Mode Switcher */}
                        <div className="flex items-center gap-6 mb-4">
                            <button
                                onClick={() => setMode('photo')}
                                className={`text-lg font-semibold ${mode === 'photo' ? 'text-white' : 'text-gray-400'}`}
                            >
                                PHOTO
                            </button>
                            <button
                                onClick={() => setMode('video')}
                                className={`text-lg font-semibold ${mode === 'video' ? 'text-white' : 'text-gray-400'}`}
                            >
                                VIDEO
                            </button>
                        </div>

                        {/* Capture and Flip Controls */}
                        <div className="flex items-center justify-center gap-12 w-full">
                            <div className="w-16" />

                            {/* Capture Button */}
                            <button
                                onClick={handleCapture}
                                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent hover:bg-white/20 transition-all"
                            >
                                {isRecording ? (
                                    <IoStopCircle className="text-red-600 text-5xl" />
                                ) : (
                                    <div className={`w-16 h-16 rounded-full ${mode === 'video' ? 'bg-red-600' : 'bg-white'}`} />
                                )}
                            </button>

                            {/* Flip Camera */}
                            <button
                                onClick={flipCamera}
                                className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
                            >
                                <IoCameraReverse className="text-white text-3xl" />
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Preview Captured Media */}
                    <div className="w-full h-full flex items-center justify-center bg-black">
                        {mediaType === 'photo' ? (
                            <img
                                src={capturedMedia.url}
                                alt="Captured"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <video
                                ref={previewVideoRef}
                                src={capturedMedia.url}
                                controls
                                autoPlay
                                loop
                                className="w-full h-full object-contain"
                            />
                        )}
                    </div>

                    {/* Preview Controls */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-around z-10">
                        <button
                            onClick={retake}
                            className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
                        >
                            <IoRefresh className="text-white text-3xl" />
                        </button>

                        <button
                            onClick={handleSendClick}
                            className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 hover:from-[#2a2a2a] hover:to-[#151515] transition-all"
                        >
                            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                <IoSend className="text-white text-2xl" />
                            </div>
                        </button>
                    </div>
                </>
            )}

            {/* Chat List Modal */}
            {showChatList && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h2 className="text-white text-xl font-bold">Send to...</h2>
                        <button
                            onClick={() => setShowChatList(false)}
                            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                        >
                            <IoClose className="text-white text-xl" />
                        </button>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {chatRooms.map((chat) => (
                            <div
                                key={chat.chatRoomId}
                                onClick={() => handleChatSelect(chat)}
                                className={`flex items-center p-3 rounded-xl mb-2 cursor-pointer transition-all ${selectedChat?.chatRoomId === chat.chatRoomId
                                    ? 'bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)] border border-white/20'
                                    : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                    }`}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] flex items-center justify-center mr-3">
                                    {chat.avatar ? (
                                        <img
                                            src={chat.avatar}
                                            alt={chat.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-white text-sm font-semibold">
                                            {chat.name.charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <span className="text-white font-medium">{chat.name}</span>
                                {selectedChat?.chatRoomId === chat.chatRoomId && (
                                    <IoCheckmark className="text-white text-xl ml-auto" />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Send Button */}
                    {selectedChat && (
                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={sendMedia}
                                disabled={sending}
                                className="w-full py-4 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 text-white font-semibold text-lg disabled:opacity-50 hover:from-[#2a2a2a] hover:to-[#151515] transition-all"
                            >
                                {sending ? 'Sending...' : `Send to ${selectedChat.name}`}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
