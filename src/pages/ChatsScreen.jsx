import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IoChatbubbles,
    IoAdd,
    IoSearch,
    IoCamera,
    IoPeople,
    IoSettings
} from 'react-icons/io5';
import { Colors } from '../constants/Colors';
import { ApiUtils } from '../services/AuthService';
import chatApiService from '../services/ChatApiService';

export default function ChatsScreen() {
    const navigate = useNavigate();
    const [chatRooms, setChatRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadChatRooms();
    }, []);

    const loadChatRooms = async () => {
        try {
            setLoading(true);

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
                alert('User not logged in. Please login again.');
                navigate('/login');
                return;
            }
            // Call the real API
            const response = await chatApiService.getAllChatRooms(finalUserId, {
                pageNumber: 1,
                size: 20,
                sortBy: 'createdAt',
                sortDirection: 'desc',
            });
            // Transform API response to match UI expectations
            const transformedChatRooms =
                response.data?.map((room) => {
                    // Determine which user is the "other" user (not the current user)
                    const isCurrentUserUser1 = room.userId === finalUserId;
                    const otherUserName = isCurrentUserUser1
                        ? room.user2Name
                        : room.userName;
                    const otherUserId = isCurrentUserUser1 ? room.user2Id : room.userId;
                    const otherUserProfileURL = isCurrentUserUser1
                        ? room.user2ProfileURL
                        : room.userProfileURL;
                    return {
                        id: room.chatRoomId?.toString(),
                        chatRoomId: room.chatRoomId,
                        name: otherUserName || 'Unknown User',
                        message: room.lastMessage || 'No messages yet',
                        time: room.lastMessageTime
                            ? formatTime(room.lastMessageTime)
                            : '12:00',
                        unreadCount: room.unreadCount || 0,
                        avatar:
                            otherUserProfileURL ||
                            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
                        receiverId: otherUserId,
                    };
                }) || [];

            setChatRooms(transformedChatRooms);
        } catch (error) {
            console.error('Error loading chat rooms:', error);
            alert('Failed to load chat rooms');
            setChatRooms([]);
        } finally {
            setLoading(false);
        }
    };

    // Helper function to format time
    const formatTime = (timestamp) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
        } catch (error) {
            return '12:00';
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadChatRooms();
        setRefreshing(false);
    };

    const filteredChatRooms = chatRooms.filter((room) => {
        if (!room || !room.name) {
            return false;
        }
        const message = room.message || 'No messages yet';
        return (
            room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            message.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

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
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center">
                    <img
                        src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
                        alt="Profile"
                        className="w-10 h-10 rounded-full mr-4 shadow-lg"
                    />
                    <h1 className="text-2xl font-bold text-white">Chats</h1>
                </div>
                <button className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors">
                    <IoAdd className="text-white text-2xl" />
                </button>
            </div>

            {/* Search Bar */}
            <div className="px-5 mb-5">
                <div className="flex items-center bg-[#1a1a1a] rounded-full px-5 py-3 shadow-inner border border-gray-800">
                    <IoSearch className="text-gray-500 text-xl mr-4" />
                    <input
                        type="text"
                        placeholder="Search"
                        className="flex-1 bg-transparent text-gray-400 outline-none placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-gray-400 text-lg">Loading chats...</p>
                    </div>
                ) : filteredChatRooms.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-gray-400 text-lg">No chats found</p>
                    </div>
                ) : (
                    filteredChatRooms.map((item, index) => {
                        try {
                            if (!item) return null;

                            return (
                                <div
                                    key={item.id || item.chatRoomId?.toString() || `chat-${index}`}
                                    onClick={() => handleChatClick(item)}
                                    className="flex items-center px-5 py-4 hover:bg-gray-900 cursor-pointer transition-colors"
                                >
                                    <img
                                        src={item.avatar || ''}
                                        alt={item.name || 'User'}
                                        className="w-12 h-12 rounded-full mr-4 shadow-lg"
                                        onError={(e) => {
                                            e.target.src =
                                                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';
                                        }}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-white font-semibold text-base">
                                                {item.name || 'Unknown User'}
                                            </h3>
                                            <span className="text-orange-500 text-xs">
                                                {item.time || '12:00'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-gray-400 text-sm truncate flex-1 mr-2">
                                                {item.message || 'No messages yet'}
                                            </p>
                                            {item.unreadCount > 0 && (
                                                <div className="bg-orange-500 rounded-full min-w-[24px] h-6 flex items-center justify-center px-2 shadow-lg">
                                                    <span className="text-white text-xs font-bold">
                                                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                    })
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-around px-5 py-3 bg-[#252525] mx-5 mb-5 rounded-full shadow-2xl">
                <button className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <IoChatbubbles className="text-white text-2xl" />
                </button>
                <button className="w-14 h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors">
                    <IoCamera className="text-gray-400 text-2xl" />
                </button>
                <button
                    onClick={() => navigate('/friends')}
                    className="w-14 h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors"
                >
                    <IoPeople className="text-gray-400 text-2xl" />
                </button>
                <button className="w-14 h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors">
                    <IoSettings className="text-gray-400 text-2xl" />
                </button>
            </div>
        </div>
    );
}
