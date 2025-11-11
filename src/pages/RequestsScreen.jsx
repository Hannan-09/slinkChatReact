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
    IoPeopleOutline,
    IoMail,
} from 'react-icons/io5';
import { Colors } from '../constants/Colors';
import { ChatRequestAPI, ApiUtils } from '../services/AuthService';

export default function RequestsScreen() {
    const navigate = useNavigate();
    const [sentRequests, setSentRequests] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [loading, setLoading] = useState(false);
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
            console.log('=== LOADING CHAT REQUESTS ===');
            console.log('Current userId:', userId);

            // Load received requests (type = "received")
            const receivedResult = await ChatRequestAPI.getAllChatRequests(
                userId,
                'PENDING',
                'received'
            );

            // Load sent requests (type = "sent")
            const sentResult = await ChatRequestAPI.getAllChatRequests(
                userId,
                'PENDING',
                'sent'
            );

            console.log('=== API RESULTS ===');
            console.log('Received result:', receivedResult);
            console.log('Sent result:', sentResult);

            if (receivedResult.success) {
                const receivedRequests = receivedResult.data?.data || [];
                console.log('Received requests from API:', receivedRequests.length);
                console.log('Received requests data:', receivedRequests);
                setReceivedRequests(receivedRequests);
            } else {
                console.error('Failed to load received requests:', receivedResult.error);
                setReceivedRequests([]);
            }

            if (sentResult.success) {
                const sentRequests = sentResult.data?.data || [];
                console.log('Sent requests from API:', sentRequests.length);
                console.log('Sent requests data:', sentRequests);
                setSentRequests(sentRequests);
            } else {
                console.error('Failed to load sent requests:', sentResult.error);
                setSentRequests([]);
            }

            console.log('=== END LOADING ===');
        } catch (error) {
            console.error('Error loading requests:', error);
            alert('Failed to load chat requests');
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
                currentUserId
            );

            if (result.success) {
                alert('Chat request accepted!');
                loadRequests(currentUserId);
            } else {
                alert(result.error || 'Failed to accept request');
            }
        } catch (error) {
            alert('Failed to accept request');
        }
    };

    const rejectRequest = async (chatRequestId) => {
        try {
            const result = await ChatRequestAPI.rejectChatRequest(
                chatRequestId,
                currentUserId
            );

            if (result.success) {
                alert('Chat request rejected');
                loadRequests(currentUserId);
            } else {
                alert(result.error || 'Failed to reject request');
            }
        } catch (error) {
            alert('Failed to reject request');
        }
    };

    const deleteRequest = async (chatRequestId) => {
        try {
            const result = await ChatRequestAPI.deleteChatRequest(
                chatRequestId,
                currentUserId
            );

            if (result.success) {
                alert('Chat request deleted');
                loadRequests(currentUserId);
            } else {
                alert(result.error || 'Failed to delete request');
            }
        } catch (error) {
            alert('Failed to delete request');
        }
    };

    const currentRequests = activeTab === 'received' ? receivedRequests : sentRequests;

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
            {/* Header */}
            <div className="flex items-center px-5 py-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 mr-4 hover:bg-gray-800 transition-colors"
                >
                    <IoArrowBack className="text-white text-xl" />
                </button>
                <h1 className="text-2xl font-bold text-white flex-1">Chat Requests</h1>
                <button
                    onClick={() => currentUserId && loadRequests(currentUserId)}
                    disabled={loading}
                    className={`w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                        }`}
                >
                    <IoRefresh
                        className={`text-xl ${loading ? 'text-gray-400 animate-spin' : 'text-white'}`}
                    />
                </button>
            </div>

            {/* Tab Selector */}
            <div className="mx-5 mb-5 bg-[#252525] rounded-full p-1 flex">
                <button
                    onClick={() => setActiveTab('received')}
                    className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${activeTab === 'received'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'text-gray-400'
                        }`}
                >
                    Received ({receivedRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('sent')}
                    className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${activeTab === 'sent'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'text-gray-400'
                        }`}
                >
                    Sent ({sentRequests.length})
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
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
                            className="flex items-center px-5 py-4 hover:bg-gray-900 transition-colors"
                        >
                            <img
                                src={
                                    activeTab === 'received'
                                        ? item.senderProfileURL || 'https://via.placeholder.com/50'
                                        : item.receiverProfileURL || 'https://via.placeholder.com/50'
                                }
                                alt={
                                    activeTab === 'received'
                                        ? item.senderName || 'User'
                                        : item.receiverName || 'User'
                                }
                                className="w-12 h-12 rounded-full mr-4 shadow-lg"
                                onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/50';
                                }}
                            />
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
                                    <button
                                        onClick={() => acceptRequest(item.chatRequestId)}
                                        className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
                                    >
                                        <IoCheckmark className="text-white text-xl" />
                                    </button>
                                    <button
                                        onClick={() => rejectRequest(item.chatRequestId)}
                                        className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <IoClose className="text-white text-xl" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => deleteRequest(item.chatRequestId)}
                                    className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <IoTrashOutline className="text-white text-xl" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-around px-5 py-3 bg-[#252525] mx-5 mb-5 rounded-full shadow-2xl">
                <button
                    onClick={() => navigate('/chats')}
                    className="w-14 h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors"
                >
                    <IoChatbubblesOutline className="text-gray-400 text-2xl" />
                </button>
                <button className="w-14 h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors">
                    <IoCamera className="text-gray-400 text-2xl" />
                </button>
                <button
                    onClick={() => navigate('/friends')}
                    className="w-14 h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors"
                >
                    <IoPeopleOutline className="text-gray-400 text-2xl" />
                </button>
                <button className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <IoMail className="text-white text-2xl" />
                </button>
            </div>
        </div>
    );
}
