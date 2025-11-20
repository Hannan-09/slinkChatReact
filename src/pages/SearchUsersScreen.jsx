import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IoSearch,
    IoClose,
    IoChatbubble,
    IoTime,
    IoChatbubblesOutline,
    IoCamera,
    IoCall,
    IoArrowBack,
    IoPeopleOutline,
    IoSettingsOutline,
    IoPersonAddOutline,
} from 'react-icons/io5';
import { UserAPI, ChatRequestAPI, ApiUtils } from '../services/AuthService';
import chatApiService from '../services/ChatApiService';

export default function SearchUsersScreen() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Get current user ID on component mount
    useEffect(() => {
        const getCurrentUser = async () => {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);
        };
        getCurrentUser();
    }, []);

    const searchUsers = async (query, pageNumber = 1, size = 10) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        if (!currentUserId) {
            console.error('Current user ID not available for search');
            alert('User not logged in');
            return;
        }

        setSearchLoading(true);
        try {
            const result = await UserAPI.searchUsers(
                query,
                currentUserId,
                pageNumber,
                size
            );
            if (result.success) {
                const responseData = result.data;
                let users = [];

                if (responseData && responseData.data) {
                    users = Array.isArray(responseData.data) ? responseData.data : [];
                } else if (Array.isArray(responseData)) {
                    users = responseData;
                }
                const transformedUsers = users.map((user) => ({
                    id: user.userId || user.id,
                    name:
                        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                        user.userName ||
                        'Unknown User',
                    username: user.userName || '',
                    avatar:
                        user.profileURL ||
                        user.avatar ||
                        'https://via.placeholder.com/50',
                    isOnline: user.isOnline || false,
                    alreadyFriend: user.alreadyFriend || false,
                    chatRequestStatus: user.chatRequestStatus || null,
                    friendRequestSent: user.friendRequestSent || false,
                    chatRoomId: user.chatRoomId || null
                }));
                setSearchResults(transformedUsers);
            } else {
                console.error('Search failed:', result.error);
                alert(result.error || 'Failed to search users');
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            alert('Failed to search users. Please try again.');
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (text.length <= 2) {
            setSearchResults([]);
        }
    };

    // Debounced search effect
    useEffect(() => {
        if (searchQuery.length > 2) {
            const timeoutId = setTimeout(() => {
                searchUsers(searchQuery);
            }, 500);
            return () => clearTimeout(timeoutId);
        }
    }, [searchQuery]);

    const startChat = async (friend) => {
        try {
            if (!currentUserId) {
                alert('User not logged in');
                return;
            }

            // If chatRoomId exists in the friend object, use it directly
            if (friend.chatRoomId) {
                navigate(
                    `/chat/${friend.chatRoomId}?name=${encodeURIComponent(
                        friend.name
                    )}&avatar=${encodeURIComponent(
                        friend.avatar || ''
                    )}&receiverId=${friend.id}`
                );
                return;
            }

            // Otherwise, navigate with friend ID (will create new chat room)
            navigate(
                `/chat/${friend.id}?name=${encodeURIComponent(
                    friend.name
                )}&avatar=${encodeURIComponent(friend.avatar || '')}&receiverId=${friend.id
                }`
            );
        } catch (error) {
            console.error('Error starting chat:', error);
            alert('Failed to start chat');
        }
    };

    const sendChatRequest = async (receiverId) => {
        if (!currentUserId) {
            alert('User not logged in');
            return;
        }

        try {
            const requestData = {
                message: "Hi! I'd like to connect with you on SlinkChat.",
            };

            const result = await ChatRequestAPI.createChatRequest(
                currentUserId,
                receiverId,
                requestData
            );
            if (result.success) {
                alert('Chat request sent!');
                setSearchResults((prev) =>
                    prev.map((user) =>
                        user.id === receiverId
                            ? {
                                ...user,
                                chatRequestStatus: 'PENDING',
                                friendRequestSent: true,
                            }
                            : user
                    )
                );
            } else {
                alert(result.error || 'Failed to send chat request');
            }
        } catch (error) {
            alert('Failed to send chat request');
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
            {/* Header */}
            <div className="flex items-center px-5 py-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 mr-2 sm:mr-4 flex-shrink-0"
                >
                    <IoArrowBack className="text-white text-xl" />
                </button>
                <h1 className="text-2xl font-bold text-white flex-1">Search User</h1>
                <div className="w-10" />
                {/* <h1 className="text-2xl font-bold text-white">Search Users</h1> */}
            </div>

            {/* Search Bar - glassy, same style as friends search */}
            <div className="px-5 mb-5">
                <div className="flex items-center rounded-full px-5 py-3 bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding">
                    <IoSearch className="text-gray-300 text-xl mr-4" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="flex-1 bg-transparent text-gray-200 outline-none placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    {searchQuery.length > 0 && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSearchResults([]);
                            }}
                        >
                            <IoClose className="text-gray-400 text-xl" />
                        </button>
                    )}
                </div>
            </div>

            {/* Results / Empty states */}
            <div className="flex-1 overflow-y-auto">
                {searchLoading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <IoSearch className="text-gray-400 text-6xl mb-4" />
                        <p className="text-gray-400 text-lg">Searching...</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Please wait while we search for users
                        </p>
                    </div>
                ) : searchQuery.length > 2 && searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <IoSearch className="text-gray-400 text-6xl mb-4" />
                        <p className="text-gray-400 text-lg font-bold">No users found</p>
                        <p className="text-gray-500 text-sm mt-2">Try a different search term</p>
                    </div>
                ) : searchQuery.length <= 2 ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <IoSearch className="text-gray-400 text-6xl mb-4" />
                        <p className="text-gray-400 text-lg font-bold">Search for friends</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Enter at least 3 characters to search
                        </p>
                    </div>
                ) : (
                    searchResults.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center px-5 py-4 cursor-pointer transition-all rounded-2xl bg-gradient-to-b from-white/8 via-white/4 to-white/2 border border-white/15 shadow-[0_16px_30px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_2px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.85)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.08),inset_0_2px_3px_rgba(255,255,255,0.24),inset_0_-3px_5px_rgba(0,0,0,0.9)] hover:bg-white/8"
                        >
                            <div className="w-12 h-12 mr-4 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_16px_24px_rgba(0,0,0,0.97),0_0_0_1px_rgba(255,255,255,0.16),inset_0_3px_4px_rgba(255,255,255,0.24),inset_0_-4px_7px_rgba(0,0,0,0.96),inset_3px_0_4px_rgba(255,255,255,0.18),inset_-3px_0_4px_rgba(0,0,0,0.82)] border border-black/70 flex items-center justify-center flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#181818] to-[#050505] shadow-[inset_0_2px_3px_rgba(255,255,255,0.45),inset_0_-3px_5px_rgba(0,0,0,0.95)] flex items-center justify-center">
                                    <img
                                        src={item.avatar || 'https://via.placeholder.com/50'}
                                        alt={item.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                        onError={(e) => {
                                            e.target.src = 'https://via.placeholder.com/50';
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold text-base">
                                    {item.name}
                                </h3>
                                <p className="text-gray-400 text-sm">@{item.username}</p>
                            </div>
                            {item.alreadyFriend ? (
                                <button
                                    onClick={() => startChat(item)}
                                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70"
                                >
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#34c759] to-[#0b7b2e] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                                        <IoChatbubble className="text-white text-lg sm:text-xl" />
                                    </div>
                                </button>
                            ) : item.chatRequestStatus === 'PENDING' ? (
                                <button
                                    disabled
                                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 opacity-90 cursor-not-allowed"
                                >
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#ffd60a] to-[#ff9f0a] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                                        <IoTime className="text-white text-lg sm:text-xl" />
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={() => sendChatRequest(item.id)}
                                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 hover:scale-105 transition-transform"
                                >
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#ff9f0a] to-[#ff3b30] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                                        <IoPersonAddOutline className="text-white text-lg sm:text-xl" />
                                    </div>
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Navigation - same shell as other screens */}
            <div className="flex items-center justify-around px-6 py-3 mx-4 mb-4 rounded-[28px] bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding">
                {/* Chats */}
                <button
                    onClick={() => navigate('/chats')}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors"
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
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors"
                >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoCall className="text-gray-300 text-2xl" />
                    </div>
                </button>

                {/* Friends */}
                <button
                    onClick={() => navigate('/requests')}
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] hover:bg-[#1d1d1d] transition-colors"
                >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoPeopleOutline className="text-gray-300 text-2xl" />
                    </div>
                </button>
            </div>
        </div>
    );
}


