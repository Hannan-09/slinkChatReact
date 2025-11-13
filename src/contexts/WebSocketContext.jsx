import { createContext, useContext, useEffect, useState, useRef } from 'react';
import useStompSocket from '../hooks/useStompSocket';

const WebSocketContext = createContext(null);

// Global online users state
const onlineUsersState = {
    users: new Set(),
    listeners: new Set(),

    setOnline(userId) {
        this.users.add(userId);
        this.notifyListeners();
    },

    setOffline(userId) {
        this.users.delete(userId);
        this.notifyListeners();
    },

    isOnline(userId) {
        return this.users.has(userId);
    },

    addListener(callback) {
        this.listeners.add(callback);
    },

    removeListener(callback) {
        this.listeners.delete(callback);
    },

    notifyListeners() {
        this.listeners.forEach(callback => callback());
    }
};

export function WebSocketProvider({ children }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Check if user is logged in
    useEffect(() => {
        const checkLoginStatus = () => {
            const userId = localStorage.getItem('userId');
            const isLoggedInFlag = localStorage.getItem('isLoggedIn');
            const loggedIn = !!(userId && isLoggedInFlag === 'true');
            setIsLoggedIn(loggedIn);
        };

        checkLoginStatus();

        // Listen for storage changes (login/logout events)
        window.addEventListener('storage', checkLoginStatus);

        // Custom event for login
        const handleLogin = () => {
            checkLoginStatus();
        };
        window.addEventListener('userLoggedIn', handleLogin);
        window.addEventListener('userLoggedOut', handleLogin);

        return () => {
            window.removeEventListener('storage', checkLoginStatus);
            window.removeEventListener('userLoggedIn', handleLogin);
            window.removeEventListener('userLoggedOut', handleLogin);
        };
    }, []);
    // Only initialize WebSocket if user is logged in
    const socket = useStompSocket({
        maxReconnectAttempts: 5,
        reconnectInterval: 3000,
        debug: true,
        enabled: isLoggedIn, // Pass enabled flag
    });

    // Subscribe to global presence updates when connected - ONLY ONCE
    const hasSubscribedRef = useRef(false);

    useEffect(() => {
        if (!socket.connected || !isLoggedIn) {
            hasSubscribedRef.current = false;
            return;
        }

        // Prevent multiple subscriptions
        if (hasSubscribedRef.current) {
            return;
        }

        hasSubscribedRef.current = true;

        // Subscribe to presence topic globally - only one subscription for entire app
        const presenceSubscription = socket.subscribe('/topic/presence', (presenceMsg) => {
            // Parse the message: "userId is ONLINE" or "userId is OFFLINE"
            const messageStr = typeof presenceMsg === 'string' ? presenceMsg : String(presenceMsg);
            const parts = messageStr.split(' is ');

            if (parts.length === 2) {
                const userId = parseInt(parts[0]);
                const status = parts[1];

                if (status === 'ONLINE') {
                    onlineUsersState.setOnline(userId);
                } else if (status === 'OFFLINE') {
                    onlineUsersState.setOffline(userId);
                }
            }
        });

        return () => {
            if (presenceSubscription) {
                socket.unsubscribe('/topic/presence');
                hasSubscribedRef.current = false;
            }
        };
    }, [socket.connected, isLoggedIn]);

    return (
        <WebSocketContext.Provider value={socket}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within WebSocketProvider');
    }
    return context;
}

// Hook to check if a user is online
export function useUserOnlineStatus(userId) {
    const [isOnline, setIsOnline] = useState(false);
    const socket = useWebSocket();

    useEffect(() => {
        // Initial check from state
        const currentlyOnline = onlineUsersState.isOnline(userId);
        setIsOnline(currentlyOnline);

        // If not in state and socket is connected, assume online initially
        // (they might have connected before we subscribed)
        if (!currentlyOnline && socket.connected && userId) {
            // Optimistically set as online, will be corrected if they go offline
            onlineUsersState.setOnline(userId);
            setIsOnline(true);
        }

        // Listen for changes
        const listener = () => {
            setIsOnline(onlineUsersState.isOnline(userId));
        };

        onlineUsersState.addListener(listener);

        return () => {
            onlineUsersState.removeListener(listener);
        };
    }, [userId, socket.connected]);

    return isOnline;
}
