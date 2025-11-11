import { createContext, useContext } from 'react';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
    // Mock WebSocket implementation - replace with actual useStompSocket hook
    const socket = {
        connected: false,
        connecting: false,
        error: null,
        sendMessage: () => {
            console.log('WebSocket sendMessage called (mock)');
            return false;
        },
        messages: [],
        sendTypingIndicator: () => {
            console.log('WebSocket sendTypingIndicator called (mock)');
        },
        subscribeToChat: () => {
            console.log('WebSocket subscribeToChat called (mock)');
            return () => { };
        },
        subscribe: () => {
            console.log('WebSocket subscribe called (mock)');
            return () => { };
        },
        unsubscribe: () => {
            console.log('WebSocket unsubscribe called (mock)');
        },
    };

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
