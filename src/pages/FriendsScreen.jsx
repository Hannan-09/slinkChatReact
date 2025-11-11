import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
    IoPeople,
    IoSettings,
    IoMailOutline,
    IoSearchOutline,
    IoPersonAddOutline,
} from 'react-icons/io5';
import { Colors } from '../constants/Colors';
import { UserAPI, ChatRequestAPI, ApiUtils } from '../services/AuthService';
import chatApiService from '../services/ChatApiService';

export default function FriendsScreen() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('requests');
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

                console.log('Received chat requests for badge:', requests.length);
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
            console.log('Searching users with query:', query);
            console.log('Current user ID:', currentUserId);

            const result = await UserAPI.searchUsers(
                query,
                currentUserId,
                pageNumber,
                size
            );

            console.log('Search API response:', result);

            if (result.success) {
                const responseData = result.data;
                let users = [];

                if (responseData && responseData.data) {
                    users = Array.isArray(responseData.data) ? responseData.data : [];
                } else if (Array.isArray(responseData)) {
                    users = responseData;
                }

                console.log('Processed search results:', users);

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
                }));

                console.log('Transformed users:', transformedUsers);
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
            console.log('=== STARTING CHAT ===');
            console.log('Friend data:', friend);
            console.log('Current user ID:', currentUserId);

            if (!currentUserId) {
                alert('User not logged in');
                return;
            }

            console.log('Looking for existing chat room...');
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
                        console.log('Found existing chat room:', existingChatRoom.chatRoomId);
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
                console.log('Error loading chat rooms:', chatRoomError);
            }

            console.log('No existing chat room found, navigating with friend ID...');
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
            console.log('=== SENDING CHAT REQUEST ===');
            console.log('SenderId (currentUserId):', currentUserId);
            console.log('ReceiverId:', receiverId);

            const requestData = {
                message: "Hi! I'd like to connect with you on SlinkChat.",
            };

            const result = await ChatRequestAPI.createChatRequest(
                currentUserId,
                receiverId,
                requestData
            );

            console.log('Chat request API result:', result);

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
                    <button
                        onClick={() => navigate('/requests')}
                        className="relative w-10 h-10 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors"
                    >
                        <IoMail className="text-white text-xl" />
                        {chatRequests.length > 0 && (
                            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                                <span className="text-white text-xs font-bold">
                                    {chatRequests.length}
                                </span>
                            </div>
                        )}
                    </button>
                    <button className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors">
                        <IoPersonAdd className="text-white text-xl" />
                    </button>
                </div>
            </div>

            {/* Tab Selector */}
            <div className="mx-5 mb-5 bg-[#252525] rounded-full p-1 flex">
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${activeTab === 'requests'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'text-gray-400'
                        }`}
                >
                    Requests ({chatRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    className={`flex-1 py-3 rounded-full text-sm font-medium transition-all ${activeTab === 'search'
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'text-gray-400'
                        }`}
                >
                    Search
                </button>
            </div>

            {/* Search Bar - Only show on search tab */}
            {activeTab === 'search' && (
                <div className="px-5 mb-5">
                    <div className="flex items-center bg-[#1a1a1a] rounded-full px-5 py-4 shadow-inner border border-gray-800">
                        <IoSearch className="text-gray-500 text-xl mr-4" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
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
                                className="flex items-center px-5 py-4 hover:bg-gray-900 transition-colors"
                            >
                                <img
                                    src={item.avatar || 'https://via.placeholder.com/50'}
                                    alt={item.name}
                                    className="w-12 h-12 rounded-full mr-4 shadow-lg"
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/50';
                                    }}
                                />
                                <div className="flex-1">
                                    <h3 className="text-white font-semibold text-base">
                                        {item.name}
                                    </h3>
                                    <p className="text-gray-400 text-sm">@{item.username}</p>
                                </div>
                                {item.alreadyFriend ? (
                                    <button
                                        onClick={() => startChat(item)}
                                        className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
                                    >
                                        <IoChatbubble className="text-white text-xl" />
                                    </button>
                                ) : item.chatRequestStatus === 'PENDING' ? (
                                    <button
                                        disabled
                                        className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg opacity-90 cursor-not-allowed"
                                    >
                                        <IoTime className="text-white text-xl" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => sendChatRequest(item.id)}
                                        className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors"
                                    >
                                        <IoPersonAddOutline className="text-white text-xl" />
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
                <button className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                    <IoPeople className="text-white text-2xl" />
                </button>
                <button className="w-14 h-14 bg-[#1a1a1a] rounded-full flex items-center justify-center shadow-inner border border-gray-800 hover:bg-gray-800 transition-colors">
                    <IoSettings className="text-gray-400 text-2xl" />
                </button>
            </div>
        </div>
    );
}
