import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IoArrowBack, IoCall, IoVideocam, IoPersonOutline } from 'react-icons/io5';
import { UserAPI } from '../services/AuthService';
import { useUserOnlineStatus } from '../contexts/WebSocketContext';
import { useToast } from '../contexts/ToastContext';

export default function UserProfileScreen() {
    const navigate = useNavigate();
    const toast = useToast();
    const { userId } = useParams();
    const [searchParams] = useSearchParams();
    const chatRoomId = searchParams.get('chatRoomId');

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const isOnline = useUserOnlineStatus(parseInt(userId));

    useEffect(() => {
        loadUserProfile();
    }, [userId]);

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            const result = await UserAPI.getProfile(userId);

            if (result.success && result.data?.data) {
                setProfile(result.data.data);
            } else {
                console.error('Failed to load profile:', result.error);
                toast.error('Failed to load user profile');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Failed to load user profile');
        } finally {
            setLoading(false);
        }
    };

    const buildInitials = (firstName, lastName, username) => {
        const safeFirst = (firstName || '').trim();
        const safeLast = (lastName || '').trim();
        const safeUsername = (username || '').trim();

        const firstInitial = (safeFirst && safeFirst.charAt(0)) || (safeUsername && safeUsername.charAt(0)) || '';
        const lastInitial = safeLast && safeLast.charAt(0);

        const combined = `${firstInitial}${lastInitial || ''}`;
        return combined ? combined.toUpperCase() : 'U';
    };

    if (loading) {
        return (
            <div className="h-screen bg-[#0a0a0a] flex items-center justify-center">
                <p className="text-white text-lg">Loading...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
                <p className="text-white text-lg mb-4">User not found</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 rounded-full bg-blue-600 text-white"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const initials = buildInitials(profile.firstName, profile.lastName, profile.username);

    return (
        <div className="h-screen bg-[#0a0a0a] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border-b border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]"
                    >
                        <IoArrowBack className="text-white text-xl" />
                    </button>
                    <h1 className="text-white text-xl font-bold">Contact Info</h1>
                    <div className="w-10" />
                </div>
            </div>

            {/* Profile Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Profile Header */}
                <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-8 flex flex-col items-center border-b border-white/10">
                    {/* Large Avatar */}
                    <div className="w-40 h-40 rounded-full bg-gradient-to-b from-[#2e2e2e] via-[#151515] to-[#050505] border-2 border-white/25 shadow-[0_18px_32px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.18),inset_0_-3px_6px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden mb-4">
                        {profile.profileURL ? (
                            <img
                                src={profile.profileURL}
                                alt={profile.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = 'https://via.placeholder.com/160';
                                }}
                            />
                        ) : (
                            <span className="text-5xl font-bold text-white">{initials}</span>
                        )}
                    </div>

                    {/* Name */}
                    <h2 className="text-white text-2xl font-bold mb-2">
                        {profile.firstName} {profile.lastName}
                    </h2>

                    {/* Username */}
                    <p className="text-gray-400 text-base mb-3">@{profile.username}</p>

                    {/* Online Status */}
                    <div className="flex items-center gap-2 mb-6">
                        {isOnline ? (
                            <>
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="text-green-400 text-sm font-medium">Online</span>
                            </>
                        ) : (
                            <>
                                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                                <span className="text-gray-400 text-sm">Offline</span>
                            </>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 w-full max-w-xs">
                        <button
                            onClick={() => {
                                // Navigate back to chat
                                if (chatRoomId) {
                                    navigate(`/chat/${chatRoomId}?name=${encodeURIComponent(profile.firstName + ' ' + profile.lastName)}&avatar=${encodeURIComponent(profile.profileURL || '')}&receiverId=${userId}`);
                                } else {
                                    navigate(-1);
                                }
                            }}
                            className="flex-1 py-3 rounded-full bg-gradient-to-b from-[#34c759] to-[#0b7b2e] text-white font-medium shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                        >
                            <IoCall className="text-xl" />
                            Audio
                        </button>
                        <button
                            onClick={() => {
                                // Navigate back to chat
                                if (chatRoomId) {
                                    navigate(`/chat/${chatRoomId}?name=${encodeURIComponent(profile.firstName + ' ' + profile.lastName)}&avatar=${encodeURIComponent(profile.profileURL || '')}&receiverId=${userId}`);
                                } else {
                                    navigate(-1);
                                }
                            }}
                            className="flex-1 py-3 rounded-full bg-gradient-to-b from-[#007aff] to-[#0051d5] text-white font-medium shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                        >
                            <IoVideocam className="text-xl" />
                            Video
                        </button>
                    </div>
                </div>

                {/* Profile Details */}
                <div className="p-4 space-y-4">
                    {/* About Section */}
                    <div className="bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 rounded-2xl p-4 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]">
                        <h3 className="text-gray-400 text-sm mb-3">About</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <IoPersonOutline className="text-gray-400 text-xl" />
                                <div>
                                    <p className="text-white text-sm font-medium">First Name</p>
                                    <p className="text-gray-400 text-sm">{profile.firstName || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <IoPersonOutline className="text-gray-400 text-xl" />
                                <div>
                                    <p className="text-white text-sm font-medium">Last Name</p>
                                    <p className="text-gray-400 text-sm">{profile.lastName || 'Not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <IoPersonOutline className="text-gray-400 text-xl" />
                                <div>
                                    <p className="text-white text-sm font-medium">Username</p>
                                    <p className="text-gray-400 text-sm">@{profile.username}</p>
                                </div>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
}
