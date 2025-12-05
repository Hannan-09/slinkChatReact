import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { IoMic, IoCamera, IoFolder, IoNotifications, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';

export default function PermissionsScreen() {
    const navigate = useNavigate();
    const [permissions, setPermissions] = useState({
        microphone: null, // null = not requested, true = granted, false = denied
        camera: null,
        storage: null,
        notifications: null, // Add notifications permission
    });
    const [isRequesting, setIsRequesting] = useState(false);

    // Check if user is already logged in
    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            // User is already logged in, skip to home
            navigate('/home');
        }
    }, [navigate]);

    const handleContinue = () => {
        // Save that permissions have been requested
        localStorage.setItem('permissionsGranted', 'true');
        navigate('/login');
    };

    // Auto-navigate when all permissions are granted
    useEffect(() => {
        const allGranted = permissions.microphone && permissions.camera && permissions.storage && permissions.notifications;
        if (allGranted) {
            // Wait 1 second to show success state, then navigate
            const timer = setTimeout(() => {
                handleContinue();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [permissions]);

    const requestPermission = async (type) => {
        setIsRequesting(true);
        try {
            let granted = false;

            if (type === 'microphone') {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                granted = true;
            } else if (type === 'camera') {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop());
                granted = true;
            } else if (type === 'storage') {
                // For web, storage is always available
                granted = true;
            } else if (type === 'notifications') {
                // Request notification permission
                if (Capacitor.isNativePlatform()) {
                    // Native platform (Android/iOS)
                    try {
                        const permStatus = await PushNotifications.requestPermissions();
                        granted = permStatus.receive === 'granted';
                        console.log('📱 Notification permission:', granted);
                    } catch (error) {
                        console.error('❌ Error requesting notification permission:', error);
                        granted = false;
                    }
                } else if ('Notification' in window) {
                    // Web platform
                    const permission = await Notification.requestPermission();
                    granted = permission === 'granted';
                    console.log('🌐 Notification permission:', granted);
                } else {
                    // Not supported
                    granted = true; // Don't block user
                }
            }

            setPermissions(prev => ({ ...prev, [type]: granted }));
        } catch (error) {
            console.error(`${type} permission denied:`, error);
            setPermissions(prev => ({ ...prev, [type]: false }));
        } finally {
            setIsRequesting(false);
        }
    };

    const requestAllPermissions = async () => {
        await requestPermission('microphone');
        await requestPermission('camera');
        await requestPermission('storage');
        await requestPermission('notifications');
    };

    const allPermissionsGranted = permissions.microphone && permissions.camera && permissions.storage && permissions.notifications;

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden safe-area-top">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-50"></div>
            <div className="absolute top-10 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-700"></div>

            <div className="bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92)] relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Permissions Required
                    </h1>
                    <p className="text-white text-opacity-80">
                        We need access to these features for the best experience
                    </p>
                </div>

                {/* Permission Cards */}
                <div className="space-y-4 mb-8">
                    {/* Microphone */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between border border-white/10 shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-inner">
                                <IoMic className="text-white text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Microphone</h3>
                                <p className="text-white text-opacity-70 text-sm">For voice calls</p>
                            </div>
                        </div>
                        {permissions.microphone === true && (
                            <IoCheckmarkCircle className="text-green-400 text-2xl" />
                        )}
                        {permissions.microphone === false && (
                            <IoCloseCircle className="text-red-400 text-2xl" />
                        )}
                    </div>

                    {/* Camera */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between border border-white/10 shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-inner">
                                <IoCamera className="text-white text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Camera</h3>
                                <p className="text-white text-opacity-70 text-sm">For video calls</p>
                            </div>
                        </div>
                        {permissions.camera === true && (
                            <IoCheckmarkCircle className="text-green-400 text-2xl" />
                        )}
                        {permissions.camera === false && (
                            <IoCloseCircle className="text-red-400 text-2xl" />
                        )}
                    </div>

                    {/* Storage */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between border border-white/10 shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-inner">
                                <IoFolder className="text-white text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Storage</h3>
                                <p className="text-white text-opacity-70 text-sm">For media files</p>
                            </div>
                        </div>
                        {permissions.storage === true && (
                            <IoCheckmarkCircle className="text-green-400 text-2xl" />
                        )}
                        {permissions.storage === false && (
                            <IoCloseCircle className="text-red-400 text-2xl" />
                        )}
                    </div>

                    {/* Notifications */}
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between border border-white/10 shadow-lg">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-inner">
                                <IoNotifications className="text-white text-2xl" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Notifications</h3>
                                <p className="text-white text-opacity-70 text-sm">For message alerts</p>
                            </div>
                        </div>
                        {permissions.notifications === true && (
                            <IoCheckmarkCircle className="text-green-400 text-2xl" />
                        )}
                        {permissions.notifications === false && (
                            <IoCloseCircle className="text-red-400 text-2xl" />
                        )}
                    </div>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={requestAllPermissions}
                        disabled={isRequesting || allPermissionsGranted}
                        className="w-full bg-white text-black font-semibold py-4 rounded-2xl hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isRequesting ? 'Requesting...' : allPermissionsGranted ? 'All Granted!' : 'Grant Permissions'}
                    </button>

                    <button
                        onClick={handleContinue}
                        className="w-full bg-white/20 backdrop-blur-xl text-white font-semibold py-4 rounded-2xl hover:bg-white/30 transition-all border border-white/30 shadow-lg"
                    >
                        {allPermissionsGranted ? 'Continue' : 'Skip for Now'}
                    </button>
                </div>

                {/* Note */}
                <p className="text-white/60 text-xs text-center mt-6">
                    You can change these permissions later in your browser settings
                </p>
            </div>
        </div>
    );
}
