import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { CallProvider } from './contexts/CallContext';
import { ToastProvider } from './contexts/ToastContext';
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
import CallHistoryScreen from './pages/CallHistoryScreen';
import SettingsScreen from './pages/SettingsScreen';
import CameraScreen from './pages/CameraScreen';
import UserProfileScreen from './pages/UserProfileScreen';
import { ApiUtils } from './services/AuthService';
import { useFirebaseNotifications } from './hooks/useFirebaseNotifications';
import InAppNotificationManager from './components/InAppNotificationManager';

// Inner component that uses Firebase notifications
function AppContent({ currentUserId }) {
  // Initialize Firebase notifications (inside ToastProvider)
  const { fcmToken } = useFirebaseNotifications();

  // Send FCM token to backend when user is logged in
  useEffect(() => {
    const sendTokenToBackend = async () => {
      if (fcmToken && currentUserId) {
        console.log('📤 Sending FCM token to backend:', fcmToken);
        console.log('📤 User ID:', currentUserId);

        try {
          const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('authToken');
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.200:8008/api/v1';

          const response = await fetch(`${API_BASE_URL}/users/set/fcm-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              // userId: parseInt(currentUserId),
              token: fcmToken
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ FCM token sent to backend successfully:', data);
          } else {
            const errorText = await response.text();
            console.error('❌ Failed to send FCM token to backend:', response.status, errorText);
          }
        } catch (error) {
          console.error('❌ Error sending FCM token to backend:', error);
        }
      }
    };

    sendTokenToBackend();
  }, [fcmToken, currentUserId]);

  return (
    <WebSocketProvider>
      <CallProvider currentUserId={currentUserId}>
        <Router>
          <InAppNotificationManager currentUserId={currentUserId} />
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
            <Route path="/call-history" element={<CallHistoryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/camera" element={<CameraScreen />} />
            <Route path="/user-profile/:userId" element={<UserProfileScreen />} />
          </Routes>
        </Router>
      </CallProvider>
    </WebSocketProvider>
  );
}

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
    <ToastProvider>
      <AppContent currentUserId={currentUserId} />
    </ToastProvider>
  );
}

export default App;
