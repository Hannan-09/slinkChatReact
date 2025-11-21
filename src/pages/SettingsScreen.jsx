import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCamera, IoPerson, IoLockClosed, IoLogOut, IoCheckmark, IoClose } from 'react-icons/io5';
import { ApiUtils, AuthAPI, UserAPI } from '../services/AuthService';
import { useToast } from '../contexts/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';

export default function SettingsScreen() {
    const navigate = useNavigate();
    const toast = useToast();
    const fileInputRef = useRef(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [userProfile, setUserProfile] = useState({
        firstName: '',
        lastName: '',
        username: '',
        avatar: '',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState({});
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);

            // Fetch profile from API
            const result = await UserAPI.getProfile(userId);

            if (result.success && result.data?.data) {
                const profileData = result.data.data;

                console.log('📸 Profile data received:', profileData);
                console.log('📸 Profile URL:', profileData.profileURL);

                setUserProfile({
                    firstName: profileData.firstName || '',
                    lastName: profileData.lastName || '',
                    username: profileData.username || '',
                    avatar: profileData.profileURL || '',
                });
                setEditedProfile({
                    firstName: profileData.firstName || '',
                    lastName: profileData.lastName || '',
                });

                // Update localStorage with fresh data
                if (profileData.firstName) localStorage.setItem('firstName', profileData.firstName);
                if (profileData.lastName) localStorage.setItem('lastName', profileData.lastName);
                if (profileData.username) localStorage.setItem('username', profileData.username);
                if (profileData.profileURL) localStorage.setItem('profileURL', profileData.profileURL);
            } else {
                // Fallback to localStorage if API fails
                const firstName = localStorage.getItem('firstName') || '';
                const lastName = localStorage.getItem('lastName') || '';
                const username = localStorage.getItem('username') || '';

                const profileURL = localStorage.getItem('profileURL') || '';

                setUserProfile({
                    firstName,
                    lastName,
                    username,
                    avatar: profileURL,
                });
                setEditedProfile({
                    firstName,
                    lastName,
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);

            // Fallback to localStorage on error
            const firstName = localStorage.getItem('firstName') || '';
            const lastName = localStorage.getItem('lastName') || '';
            const username = localStorage.getItem('username') || '';
            const profileURL = localStorage.getItem('profileURL') || '';

            setUserProfile({
                firstName,
                lastName,
                username,
                avatar: profileURL,
            });
            setEditedProfile({
                firstName,
                lastName,
            });
        }
    };

    const handleEditProfile = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedProfile({
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
        });
        setSelectedAvatar(null);
        setAvatarPreview(null);
    };

    const handleSaveProfile = async () => {
        try {
            const result = await AuthAPI.updateProfile(
                currentUserId,
                editedProfile.firstName,
                editedProfile.lastName,
                selectedAvatar // Pass the selected avatar file
            );

            if (result.success) {
                setUserProfile(prev => ({
                    ...prev,
                    ...editedProfile,
                    avatar: avatarPreview || prev.avatar
                }));
                setIsEditing(false);
                setSelectedAvatar(null);
                setAvatarPreview(null);
                toast.success('Profile updated successfully!');
                // Reload profile to get updated data from server
                loadUserProfile();
            } else {
                toast.error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.warning('New passwords do not match');
            return;
        }

        if (!passwordData.currentPassword || !passwordData.newPassword) {
            toast.warning('Please fill in all password fields');
            return;
        }

        try {
            const result = await AuthAPI.updatePassword(
                currentUserId,
                passwordData.currentPassword,
                passwordData.newPassword
            );

            if (result.success) {
                toast.success('Password updated successfully!');
                setShowChangePassword(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                toast.error(result.error || 'Failed to update password');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            toast.error('Failed to update password');
        }
    };

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = async () => {
        setShowLogoutConfirm(false);
        await AuthAPI.logout();
        navigate('/login');
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    const handleAvatarChange = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.warning('Please select an image file');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.warning('Image size should be less than 5MB');
                return;
            }

            setSelectedAvatar(file);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);

            // Automatically enable edit mode when avatar is selected
            if (!isEditing) {
                setIsEditing(true);
            }
        }
    };

    return (
        <div className="h-screen bg-[#0a0a0a] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border-b border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                <div className="flex items-center justify-between p-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-b from-[#252525] to-[#101010] shadow-[0_10px_16px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.14),inset_0_2px_3px_rgba(255,255,255,0.22),inset_0_-3px_5px_rgba(0,0,0,0.9)] border border-black/70 mr-2 sm:mr-4 flex-shrink-0"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-gradient-to-b from-[#3a3a3a] to-[#111111] shadow-[inset_0_2px_3px_rgba(255,255,255,0.6),inset_0_-3px_4px_rgba(0,0,0,0.85)]">
                            <IoArrowBack className="text-white text-lg sm:text-xl" />
                        </div>
                    </button>

                    <h1 className="text-2xl font-bold text-white flex-1">Settings</h1>
                    <div className="w-10" />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Profile Section */}
                <div className="bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 rounded-2xl p-6 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]">
                    {/* Avatar */}
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#2e2e2e] via-[#151515] to-[#050505] border border-white/25 shadow-[0_18px_32px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.18),inset_0_-3px_6px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
                                {avatarPreview || (userProfile.avatar && userProfile.avatar !== 'https://via.placeholder.com/150') ? (
                                    <img
                                        src={avatarPreview || userProfile.avatar}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            console.error('Avatar load error:', e.target.src);
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span className="text-3xl font-bold text-white">
                                        {((userProfile.firstName?.[0] || '') + (userProfile.lastName?.[0] || '')).toUpperCase() || 'U'}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleAvatarChange}
                                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-b from-[#4c4c4c] via-[#2a2a2a] to-[#111111] border border-[#f5f5f5]/30 shadow-[0_10px_18px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.85)] flex items-center justify-center"
                            >
                                <IoCamera className="text-white text-sm" />
                            </button>
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                        <h2 className="text-white text-xl font-bold mt-4">
                            {userProfile.firstName} {userProfile.lastName}
                        </h2>
                        <p className="text-gray-400 text-sm">@{userProfile.username}</p>
                    </div>

                    {/* Edit Profile Form */}
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">First Name</label>
                                <input
                                    type="text"
                                    value={editedProfile.firstName}
                                    onChange={(e) => setEditedProfile(prev => ({ ...prev, firstName: e.target.value }))}
                                    className="w-full bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Last Name</label>
                                <input
                                    type="text"
                                    value={editedProfile.lastName}
                                    onChange={(e) => setEditedProfile(prev => ({ ...prev, lastName: e.target.value }))}
                                    className="w-full bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleSaveProfile}
                                    className="flex-1 py-3 rounded-full bg-gradient-to-b from-[#34c759] to-[#0b7b2e] text-white font-medium shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                                >
                                    <IoCheckmark className="text-xl" />
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="flex-1 py-3 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] text-white font-medium border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                                >
                                    <IoClose className="text-xl" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={handleEditProfile}
                            className="w-full py-3 rounded-full bg-gradient-to-b from-[#4c4c4c] via-[#2a2a2a] to-[#111111] text-white font-medium border border-[#f5f5f5]/30 shadow-[0_10px_18px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.85)] flex items-center justify-center gap-2"
                        >
                            <IoPerson className="text-xl" />
                            Edit Profile
                        </button>
                    )}
                </div>

                {/* Change Password Section */}
                <div className="bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 rounded-2xl p-6 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]">
                    <h3 className="text-white text-lg font-semibold mb-4">Security</h3>

                    {showChangePassword ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    className="w-full bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                    className="w-full bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    className="w-full bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleChangePassword}
                                    className="flex-1 py-3 rounded-full bg-gradient-to-b from-[#34c759] to-[#0b7b2e] text-white font-medium shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                                >
                                    <IoCheckmark className="text-xl" />
                                    Update
                                </button>
                                <button
                                    onClick={() => {
                                        setShowChangePassword(false);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="flex-1 py-3 rounded-full bg-gradient-to-b from-[#252525] to-[#101010] text-white font-medium border border-black/70 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                                >
                                    <IoClose className="text-xl" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowChangePassword(true)}
                            className="w-full py-3 rounded-full bg-gradient-to-b from-[#4c4c4c] via-[#2a2a2a] to-[#111111] text-white font-medium border border-[#f5f5f5]/30 shadow-[0_10px_18px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.85)] flex items-center justify-center gap-2"
                        >
                            <IoLockClosed className="text-xl" />
                            Change Password
                        </button>
                    )}
                </div>

                {/* Logout Section */}
                <div className="bg-gradient-to-b from-[#252525] to-[#101010] border border-black/70 rounded-2xl p-6 shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-2px_3px_rgba(0,0,0,0.9)]">
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 rounded-full bg-gradient-to-b from-[#ff3b30] to-[#c41e14] text-white font-medium shadow-[0_6px_10px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                    >
                        <IoLogOut className="text-xl" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Logout Confirmation Dialog */}
            {showLogoutConfirm && (
                <ConfirmDialog
                    title="Logout"
                    message="Are you sure you want to logout? You will need to login again to access your account."
                    confirmText="Logout"
                    cancelText="Cancel"
                    type="warning"
                    onConfirm={confirmLogout}
                    onCancel={cancelLogout}
                />
            )}
        </div>
    );
}
