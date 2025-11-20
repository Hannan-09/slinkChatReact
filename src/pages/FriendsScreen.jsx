import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    IoMail,
    IoPersonAdd,
    IoSearch,
    IoClose,
    IoChatbubble,
    IoTime,
    IoCheckmark,
    IoChatbubblesOutline,
    IoCamera,
    IoCall,
    IoPeople,
    IoSettingsOutline,
    IoMailOutline,
    IoSearchOutline,
    IoPersonAddOutline,
} from 'react-icons/io5';
import { Colors } from '../constants/Colors';
import { UserAPI, ChatRequestAPI, ApiUtils } from '../services/AuthService';
import chatApiService from '../services/ChatApiService';

export default function FriendsScreen() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(() => {
        // Allow navigation to pre-select tab (e.g. from Chats "add friend" button)
        return location.state?.initialTab === 'search' ? 'search' : 'requests';
    });
    const [chatRequests, setChatRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    // Get current user ID on component mount
    useEffect(() => {
        const getCurrentUser = async () => {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);
        };
        getCurrentUser();
    }, []);

    // Load chat requests when user ID is available
    useEffect(() => {
        if (currentUserId) {
            loadChatRequests(currentUserId);
        }
    }, [currentUserId]);

    // Load chat requests (only received requests for badge count)
    const loadChatRequests = async (userId) => {
        setRequestsLoading(true);
        try {
            const result = await ChatRequestAPI.getAllChatRequests(
                userId,
                'PENDING',
                'received'
            );

            if (result.success) {
                const responseData = result.data;
                let requests = [];

                if (responseData && responseData.data) {
                    requests = Array.isArray(responseData.data) ? responseData.data : [];
                } else if (Array.isArray(responseData)) {
                    requests = responseData;
                }
                setChatRequests(requests);
            } else {
                console.error('Failed to load chat requests:', result.error);
                setChatRequests([]);
            }
        } catch (error) {
            console.error('Error loading chat requests:', error);
            setChatRequests([]);
        } finally {
            setRequestsLoading(false);
        }
    };

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
                        user.username ||
                        'Unknown User',
                    username: user.username || '',
                    avatar:
                        user.profileURL ||
                        user.avatar ||
                        'https://via.placeholder.com/50',
                    isOnline: user.isOnline || false,
                    alreadyFriend: user.alreadyFriend || false,
                    chatRequestStatus: user.chatRequestStatus || null,
                    friendRequestSent: user.friendRequestSent || false,
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
            try {
                const chatRoomsResult = await chatApiService.getAllChatRooms(
                    currentUserId,
                    {
                        pageNumber: 1,
                        size: 100,
                        sortBy: 'createdAt',
                        sortDirection: 'desc',
                    }
                );

                if (chatRoomsResult.success && chatRoomsResult.data) {
                    const chatRooms = chatRoomsResult.data;
                    const existingChatRoom = chatRooms.find((room) => {
                        const isCurrentUserUser1 = room.userId === currentUserId;
                        const otherUserId = isCurrentUserUser1 ? room.user2Id : room.userId;
                        return otherUserId === friend.id;
                    });

                    if (existingChatRoom) {
                        navigate(
                            `/chat/${existingChatRoom.chatRoomId}?name=${encodeURIComponent(
                                friend.name
                            )}&avatar=${encodeURIComponent(
                                friend.avatar || ''
                            )}&receiverId=${friend.id}`
                        );
                        return;
                    }
                }
            } catch (chatRoomError) {
            }
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

    const acceptChatRequest = async (chatRequestId) => {
        if (!currentUserId) return;

        try {
            const result = await ChatRequestAPI.acceptChatRequest(
                chatRequestId,
                currentUserId
            );

            if (result.success) {
                alert('Chat request accepted!');
                loadChatRequests(currentUserId);
            } else {
                alert(result.error || 'Failed to accept chat request');
            }
        } catch (error) {
            alert('Failed to accept chat request');
        }
    };

    const rejectChatRequest = async (chatRequestId) => {
        if (!currentUserId) return;

        try {
            const result = await ChatRequestAPI.rejectChatRequest(
                chatRequestId,
                currentUserId
            );

            if (result.success) {
                alert('Chat request rejected');
                loadChatRequests(currentUserId);
            } else {
                alert(result.error || 'Failed to reject chat request');
            }
        } catch (error) {
            alert('Failed to reject chat request');
        }
    };

    return (
        <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
                <h1 className="text-2xl font-bold text-white">Friends</h1>
                <div className="flex items-center gap-3">
                    {/* Requests button - neumorphic */}
                    <button
                        onClick={() => navigate('/requests')}
                        className="relative w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70"
                    >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-b from-[#0a84ff] to-[#0040dd] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                            <IoMail className="text-white text-xl" />
                        </div>
                        {chatRequests.length > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-[0_3px_6px_rgba(0,0,0,0.8)]">
                                <span className="text-white text-xs font-bold">
                                    {chatRequests.length}
                                </span>
                            </div>
                        )}
                    </button>

                    {/* Add friend button - switch to Search tab */}
                    <button
                        onClick={() => setActiveTab('search')}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70"
                    >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-b from-[#ff9f0a] to-[#c96a00] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                            <IoPersonAdd className="text-white text-xl" />
                        </div>
                    </button>
                </div>
            </div>

            {/* Tab Selector - glassy pill shell + 3D buttons (no extra border on active) */}
            <div className="mx-5 mb-5 rounded-full p-1 flex bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92),inset_3px_0_4px_rgba(255,255,255,0.14),inset_-3px_0_4px_rgba(0,0,0,0.7)] backdrop-blur-2xl bg-clip-padding">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'requests'
                        ? 'bg-gradient-to-b from-[#252525] to-[#101010] text-white shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]'
                        : 'text-gray-400'
                        }`}
                >
                    Requests ({chatRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === 'search'
                        ? 'bg-gradient-to-b from-[#252525] to-[#101010] text-white shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]'
                        : 'text-gray-400'
                        }`}
                >
                    Search
                </button>
            </div>

            {/* Search Bar - Only show on search tab, using Chats glassy style */}
            {activeTab === 'search' && (
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
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'requests' ? (
                    // Requests Tab
                    requestsLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <IoMailOutline className="text-gray-400 text-6xl mb-4" />
                            <p className="text-gray-400 text-lg">Loading requests...</p>
                        </div>
                    ) : chatRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <IoMailOutline className="text-gray-400 text-6xl mb-4" />
                            <p className="text-gray-400 text-lg font-bold">No chat requests</p>
                            <p className="text-gray-500 text-sm mt-2">
                                You'll see incoming chat requests here
                            </p>
                        </div>
                    ) : (
                        chatRequests.map((item) => (
                            <div
                                key={item.chatRequestId}
                                className="flex items-center bg-[#252525] mx-5 my-2 p-4 rounded-2xl shadow-lg"
                            >
                                <img
                                    src={item.senderProfileURL || 'https://via.placeholder.com/50'}
                                    alt={item.senderName}
                                    className="w-12 h-12 rounded-full mr-4 shadow-lg"
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/50';
                                    }}
                                />
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold text-base mb-1">
                                        {item.senderName || 'Unknown User'}
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-1">
                                        {item.description || item.title || 'Wants to connect with you'}
                                    </p>
                                    <p className="text-gray-500 text-xs">
                                        {new Date(item.createdAt).toLocaleDateString()}
                                    </p>
                                    <p className="text-orange-500 text-xs font-medium mt-1">
                                        Status: {item.chatRequestStatus}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => acceptChatRequest(item.chatRequestId)}
                                        className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
                                    >
                                        <IoCheckmark className="text-white text-xl" />
                                    </button>
                                    <button
                                        onClick={() => rejectChatRequest(item.chatRequestId)}
                                        className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <IoClose className="text-white text-xl" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                ) : // Search Tab
                    searchLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <IoSearchOutline className="text-gray-400 text-6xl mb-4" />
                            <p className="text-gray-400 text-lg">Searching...</p>
                            <p className="text-gray-500 text-sm mt-2">
                                Please wait while we search for users
                            </p>
                        </div>
                    ) : searchQuery.length > 2 && searchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <IoSearchOutline className="text-gray-400 text-6xl mb-4" />
                            <p className="text-gray-400 text-lg font-bold">No users found</p>
                            <p className="text-gray-500 text-sm mt-2">Try a different search term</p>
                        </div>
                    ) : searchQuery.length <= 2 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <IoSearchOutline className="text-gray-400 text-6xl mb-4" />
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

                {/* Friends (active) */}
                <button className="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)] border border-black/70 animate-pulse">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),inset_0_-2px_3px_rgba(0,0,0,0.7)]">
                        <IoPeople className="text-white text-3xl" />
                    </div>
                </button>
            </div>
        </div>
    );
}
