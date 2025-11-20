import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoCamera, IoPerson, IoLockClosed, IoLogOut, IoCheckmark, IoClose } from 'react-icons/io5';
import { ApiUtils, AuthAPI } from '../services/AuthService';

export default function SettingsScreen() {
    const navigate = useNavigate();
    const [currentUserId, setCurrentUserId] = useState(null);
    const [userProfile, setUserProfile] = useState({
        firstName: '',
        lastName: '',
        username: '',
        avatar: '',
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState({});
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    useEffect(() => {
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        try {
            const userId = await ApiUtils.getCurrentUserId();
            setCurrentUserId(userId);

            // Get data from localStorage
            const firstName = localStorage.getItem('firstName') || '';
            const lastName = localStorage.getItem('lastName') || '';
            const username = localStorage.getItem('username') || '';

            const userData = await ApiUtils.getStoredUser();
            const avatar = userData?.profilePicture || 'https://via.placeholder.com/150';

            setUserProfile({
                firstName,
                lastName,
                username,
                avatar,
            });
            setEditedProfile({
                firstName,
                lastName,
            });
        } catch (error) {
            console.error('Error loading profile:', error);
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
    };

    const handleSaveProfile = async () => {
        try {
            const result = await AuthAPI.updateProfile(
                currentUserId,
                editedProfile.firstName,
                editedProfile.lastName,
                null // profileImage - will be added when avatar upload is implemented
            );

            if (result.success) {
                setUserProfile(prev => ({
                    ...prev,
                    ...editedProfile
                }));
                setIsEditing(false);
                alert('Profile updated successfully!');
            } else {
                alert(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        if (!passwordData.currentPassword || !passwordData.newPassword) {
            alert('Please fill in all password fields');
            return;
        }

        try {
            const result = await AuthAPI.updatePassword(
                currentUserId,
                passwordData.currentPassword,
                passwordData.newPassword
            );

            if (result.success) {
                alert('Password updated successfully!');
                setShowChangePassword(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                alert(result.error || 'Failed to update password');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            alert('Failed to update password');
        }
    };

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await AuthAPI.logout();
            navigate('/login');
        }
    };

    const handleAvatarChange = () => {
        // TODO: Implement avatar upload
        alert('Avatar upload coming soon!');
    };

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
                    <h1 className="text-white text-xl font-bold">Settings</h1>
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
                                <img
                                    src={userProfile.avatar}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <button
                                onClick={handleAvatarChange}
                                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-b from-[#4c4c4c] via-[#2a2a2a] to-[#111111] border border-[#f5f5f5]/30 shadow-[0_10px_18px_rgba(0,0,0,0.9),inset_0_2px_3px_rgba(255,255,255,0.4),inset_0_-3px_5px_rgba(0,0,0,0.85)] flex items-center justify-center"
                            >
                                <IoCamera className="text-white text-sm" />
                            </button>
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
        </div>
    );
}
