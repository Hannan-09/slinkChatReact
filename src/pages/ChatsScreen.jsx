import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IoChatbubbles,
    IoChatbubblesOutline,
    IoPersonAdd,
    IoSearch,
    IoCamera,
    IoPeopleOutline,
    IoSettingsOutline
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
                    {/* Header profile - 3D avatar ring */}
                    <div className="w-10 h-10 rounded-full mr-4 bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_14px_22px_rgba(0,0,0,0.96),0_0_0_1px_rgba(255,255,255,0.14),inset_0_3px_4px_rgba(255,255,255,0.22),inset_0_-4px_7px_rgba(0,0,0,0.95),inset_3px_0_4px_rgba(255,255,255,0.18),inset_-3px_0_4px_rgba(0,0,0,0.8)] border border-black/70 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#181818] to-[#050505] shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-3px_5px_rgba(0,0,0,0.95)] flex items-center justify-center">
                            <img
                                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
                                alt="Profile"
                                className="w-7 h-7 rounded-full object-cover"
                            />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Chats</h1>
                </div>
                {/* Add friend / new chat button - match ChatDetail header button size */}
                <button className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                        <IoPersonAdd className="text-white text-lg sm:text-xl" />
                    </div>
                </button>
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
                                    className="flex items-center px-5 py-4 cursor-pointer transition-all rounded-2xl bg-gradient-to-b from-white/8 via-white/4 to-white/2 border border-white/15 shadow-[0_16px_30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.85)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.08),inset_0_2px_3px_rgba(255,255,255,0.24),inset_0_-3px_5px_rgba(0,0,0,0.9)] hover:bg-white/8"
                                >
                                    <div className="w-12 h-12 mr-4 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_16px_24px_rgba(0,0,0,0.97),0_0_0_1px_rgba(255,255,255,0.16),inset_0_3px_4px_rgba(255,255,255,0.24),inset_0_-4px_7px_rgba(0,0,0,0.96),inset_3px_0_4px_rgba(255,255,255,0.18),inset_-3px_0_4px_rgba(0,0,0,0.82)] border border-black/70 flex items-center justify-center flex-shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#181818] to-[#050505] shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-3px_5px_rgba(0,0,0,0.95)] flex items-center justify-center">
                                            <img
                                                src={item.avatar || ''}
                                                alt={item.name || 'User'}
                                                className="w-8 h-8 rounded-full object-cover"
                                                onError={(e) => {
                                                    e.target.src =
                                                        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';
                                                }}
                                            />
                                        </div>
                                    </div>
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

            {/* Bottom Navigation - glass / 3D neumorphic (same base as back button, with glassy background) */}
            <div className="flex items-center justify-around px-6 py-3 mx-4 mb-4 rounded-[28px] bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding">
                {/* Chats (active) */}
                <button className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 animate-pulse">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoChatbubbles className="text-white text-3xl" />
                    </div>
                </button>

                {/* Placeholder middle icon */}
                <button className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoCamera className="text-gray-300 text-2xl" />
                    </div>
                </button>

                {/* Friends */}
                <button
                    onClick={() => navigate('/friends')}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors"
                >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoPeopleOutline className="text-gray-300 text-2xl" />
                    </div>
                </button>

                {/* Settings */}
                <button className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoSettingsOutline className="text-gray-300 text-2xl" />
                    </div>
                </button>
            </div>
        </div>
    );
}
