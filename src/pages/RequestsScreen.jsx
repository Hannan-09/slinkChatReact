import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IoArrowBack,
    IoRefresh,
    IoCheckmark,
    IoClose,
    IoTrashOutline,
    IoMailOutline,
    IoChatbubblesOutline,
    IoCamera,
    IoCall,
    IoPeople,
    IoSettingsOutline,
} from 'react-icons/io5';
import { Colors } from '../constants/Colors';
import { ChatRequestAPI, ApiUtils } from '../services/AuthService';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function RequestsScreen() {
    const navigate = useNavigate();
    const toast = useToast();
    const [sentRequests, setSentRequests] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [activeTab, setActiveTab] = useState('received');
    const [currentUserId, setCurrentUserId] = useState(null);

    useEffect(() => {
        const getCurrentUser = async () => {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);
        };
        getCurrentUser();
    }, []);

    useEffect(() => {
        if (currentUserId) {
            loadRequests(currentUserId);
        }
    }, [currentUserId]);

    const loadRequests = async (userId) => {
        setLoading(true);
        try {
            // Load received requests (type = "received")
            const receivedResult = await ChatRequestAPI.getAllChatRequests(
                'PENDING',
                'received',
            );

            // Load sent requests (type = "sent")
            const sentResult = await ChatRequestAPI.getAllChatRequests(
                'PENDING',
                'sent'
            );
            if (receivedResult.success) {
                const receivedRequests = receivedResult.data?.data || [];
                setReceivedRequests(receivedRequests);
            } else {
                console.error('Failed to load received requests:', receivedResult.error);
                setReceivedRequests([]);
            }

            if (sentResult.success) {
                const sentRequests = sentResult.data?.data || [];
                setSentRequests(sentRequests);
            } else {
                console.error('Failed to load sent requests:', sentResult.error);
                setSentRequests([]);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            toast.error('Failed to load chat requests');
            setReceivedRequests([]);
            setSentRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const acceptRequest = async (chatRequestId) => {
        try {
            const result = await ChatRequestAPI.acceptChatRequest(
                chatRequestId,
            );

            if (result.success) {
                toast.success('Chat request accepted!');
                loadRequests(currentUserId);
            } else {
                toast.error(result.error || 'Failed to accept request');
            }
        } catch (error) {
            toast.error('Failed to accept request');
        }
    };

    const rejectRequest = async (chatRequestId) => {
        try {
            const result = await ChatRequestAPI.rejectChatRequest(
                chatRequestId,
            );

            if (result.success) {
                toast.success('Chat request rejected');
                loadRequests(currentUserId);
            } else {
                toast.error(result.error || 'Failed to reject request');
            }
        } catch (error) {
            toast.error('Failed to reject request');
        }
    };

    const handleDeleteClick = (chatRequestId) => {
        setDeleteTarget(chatRequestId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;

        setShowDeleteConfirm(false);
        try {
            const result = await ChatRequestAPI.deleteChatRequest(
                deleteTarget,
                currentUserId
            );

            if (result.success) {
                toast.success('Chat request deleted');
                loadRequests(currentUserId);
            } else {
                toast.error(result.error || 'Failed to delete request');
            }
        } catch (error) {
            toast.error('Failed to delete request');
        } finally {
            setDeleteTarget(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
    };

    const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests;

    return (
        <div className="h-screen bg-[#1a1a1a] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center px-5 py-4">
                {/* Back button - match ChatDetailScreen 3D back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 mr-2 sm:mr-4 flex-shrink-0"
                >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                        <IoArrowBack className="text-white text-lg sm:text-xl" />
                    </div>
                </button>

                <h1 className="text-2xl font-bold text-white flex-1">Chat Requests</h1>

                {/* Refresh button - 3D nav-style with grey theme (no blue) */}
                <button
                    onClick={() => currentUserId && loadRequests(currentUserId)}
                    disabled={loading}
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 flex-shrink-0 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                        <IoRefresh
                            className={`text-lg sm:text-xl text-white ${loading ? 'animate-spin' : ''}`}
                        />
                    </div>
                </button>
            </div>

            {/* Tab Selector - glassy pill shell + 3D buttons (no extra border on active) */}
            <div className="mx-5 mb-5 rounded-full p-1 flex bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding">
                <button
                    onClick={() => setActiveTab('received')}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'received'
                        ? 'bg-gradient-to-b from-[#252525] to-[#101010] text-white shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]'
                        : 'text-gray-400'
                        }`}
                >
                    Received ({receivedRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('sent')}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'sent'
                        ? 'bg-gradient-to-b from-[#252525] to-[#101010] text-white shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]'
                        : 'text-gray-400'
                        }`}
                >
                    Sent ({sentRequests.length})
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <IoMailOutline className="text-gray-400 text-6xl mb-4" />
                        <p className="text-gray-400 text-lg">Loading requests...</p>
                    </div>
                ) : currentRequests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <IoMailOutline className="text-gray-400 text-6xl mb-4" />
                        <p className="text-gray-400 text-lg font-bold">
                            No {activeTab} requests
                        </p>
                        <p className="text-gray-500 text-sm mt-2 text-center px-8">
                            {activeTab === 'received'
                                ? "You'll see incoming chat requests here"
                                : 'Your sent requests will appear here'}
                        </p>
                    </div>
                ) : (
                    currentRequests.map((item) => (
                        <div
                            key={item.chatRequestId}
                            className="flex items-center px-5 py-4 hover:bg-white/5 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full mr-4 shadow-lg bg-gradient-to-b from-[#3a3a3a] to-[#1a1a1a] flex items-center justify-center overflow-hidden">
                                {(activeTab === 'received' ? item.senderProfileURL : item.receiverProfileURL) ? (
                                    <img
                                        src={activeTab === 'received' ? item.senderProfileURL : item.receiverProfileURL}
                                        alt={activeTab === 'received' ? item.senderName || 'User' : item.receiverName || 'User'}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span className="text-white text-sm font-semibold">
                                        {activeTab === 'received'
                                            ? (item.senderName || 'U').substring(0, 2).toUpperCase()
                                            : (item.receiverName || 'U').substring(0, 2).toUpperCase()
                                        }
                                    </span>
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold text-base mb-1">
                                    {activeTab === 'received'
                                        ? item.senderName || 'Unknown User'
                                        : item.receiverName || 'Unknown User'}
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    @
                                    {activeTab === 'received'
                                        ? item.senderName?.toLowerCase().replace(/\s+/g, '') || 'username'
                                        : item.receiverName?.toLowerCase().replace(/\s+/g, '') ||
                                        'username'}
                                </p>
                            </div>

                            {activeTab === 'received' ? (
                                <div className="flex gap-2">
                                    {/* Accept - 3D nav-style button with green icon */}
                                    <button
                                        onClick={() => acceptRequest(item.chatRequestId)}
                                        className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 transition-transform hover:scale-105"
                                    >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                            <IoCheckmark className="text-[#34c759] text-lg" />
                                        </div>
                                    </button>

                                    {/* Reject - 3D nav-style button with red icon */}
                                    <button
                                        onClick={() => rejectRequest(item.chatRequestId)}
                                        className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 transition-transform hover:scale-105"
                                    >
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                            <IoClose className="text-[#ff3b30] text-lg" />
                                        </div>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleDeleteClick(item.chatRequestId)}
                                    className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 transition-transform hover:scale-105"
                                >
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                                        <IoTrashOutline className="text-[#ff3b30] text-lg" />
                                    </div>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Navigation - glass / 3D neumorphic (same base as back button, with glassy background) */}
            <div className="flex items-center justify-around px-6 py-3 mx-4 mb-4 rounded-[28px] bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding">
                {/* Chats */}
                <button
                    onClick={() => navigate('/chats')}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 hover:bg-[#1d1d1d] transition-colors"
                >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoChatbubblesOutline className="text-gray-300 text-2xl" />
                    </div>
                </button>

                {/* Camera */}
                <button className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 hover:bg-[#1d1d1d] transition-colors">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoCamera className="text-gray-300 text-2xl" />
                    </div>
                </button>

                {/* Call History */}
                <button
                    onClick={() => navigate('/call-history')}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoCall className="text-gray-300 text-2xl" />
                    </div>
                </button>

                {/* Requests (active) */}
                <button className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 animate-pulse">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoPeople className="text-white text-3xl" />
                    </div>
                </button>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Delete Request"
                    message="Are you sure you want to delete this chat request? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    type="danger"
                    onConfirm={confirmDelete}
                    onCancel={cancelDelete}
                />
            )}
        </div>
    );
}
