import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashScreen() {
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is already logged in
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const hasPermissions = localStorage.getItem('permissionsGranted') === 'true';

        const timer = setTimeout(() => {
            if (isLoggedIn) {
                navigate('/home');
            } else if (hasPermissions) {
                navigate('/login');
            } else {
                navigate('/permissions');
            }
        }, 2000); // Show splash for 2 seconds

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-black flex items-center justify-center relative safe-area-top overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 opacity-50"></div>

            {/* Glassmorphism circles */}
            <div className="absolute top-20 left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-700"></div>

            <div className="text-center relative z-10">
                {/* App Logo/Icon with glassmorphism */}
                <div className="mb-8 animate-bounce">
                    <div className="w-32 h-32 mx-auto bg-gradient-to-b from-white/16 via-white/10 to-white/6 border border-white/25 rounded-3xl shadow-[0_22px_44px_rgba(0,0,0,0.98),0_0_0_1px_rgba(255,255,255,0.12),inset_0_3px_5px_rgba(255,255,255,0.26),inset_0_-4px_7px_rgba(0,0,0,0.92)] backdrop-blur-2xl flex items-center justify-center">
                        <span className="text-6xl font-bold text-white">
                            S
                        </span>
                    </div>
                </div>

                {/* App Name */}
                <h1 className="text-5xl font-bold text-white mb-2 animate-fade-in drop-shadow-2xl">
                    Slink Chat
                </h1>
                <p className="text-white/70 text-lg animate-fade-in-delay">
                    Connect. Chat. Call.
                </p>

                {/* Loading Indicator */}
                <div className="mt-12">
                    <div className="flex justify-center space-x-2">
                        <div className="w-3 h-3 bg-white/80 rounded-full animate-pulse shadow-lg"></div>
                        <div className="w-3 h-3 bg-white/80 rounded-full animate-pulse delay-100 shadow-lg"></div>
                        <div className="w-3 h-3 bg-white/80 rounded-full animate-pulse delay-200 shadow-lg"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
