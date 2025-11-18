import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { CallProvider } from './contexts/CallContext';
import CallManager from './components/CallManager';
import SplashScreen from './pages/SplashScreen';
import PermissionsScreen from './pages/PermissionsScreen';
import LoginScreen from './pages/LoginScreen';
import SignupScreen from './pages/SignupScreen';
import ChatsScreen from './pages/ChatsScreen';
import FriendsScreen from './pages/FriendsScreen';
import RequestsScreen from './pages/RequestsScreen';
import ChatDetailScreen from './pages/ChatDetailScreen';
import SearchUsersScreen from './pages/SearchUsersScreen';
import { ApiUtils } from './services/AuthService';

function App() {
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const getUserId = async () => {
      console.log('🔍 Fetching current user ID from storage...');
      const userId = await ApiUtils.getCurrentUserId();
      console.log('✅ Current user ID loaded:', userId);
      setCurrentUserId(userId);
    };
    getUserId();
  }, []);

  return (
    <WebSocketProvider>
      <CallProvider currentUserId={currentUserId}>
        <Router>
          <CallManager />
          <Routes>
            <Route path="/" element={<SplashScreen />} />
            <Route path="/permissions" element={<PermissionsScreen />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/home" element={<Navigate to="/chats" replace />} />
            <Route path="/chats" element={<ChatsScreen />} />
            <Route path="/search" element={<SearchUsersScreen />} />
            <Route path="/friends" element={<FriendsScreen />} />
            <Route path="/requests" element={<RequestsScreen />} />
            <Route path="/chat/:id" element={<ChatDetailScreen />} />
          </Routes>
        </Router>
      </CallProvider>
    </WebSocketProvider>
  );
}

export default App;
