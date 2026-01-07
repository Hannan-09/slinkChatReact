import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { CallProvider } from './contexts/CallContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
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
import IosInstallGuide from './pages/IosInstallGuide';
import DebugScreen from './pages/DebugScreen';
import { ApiUtils } from './services/AuthService';
import StorageService from './services/StorageService';
import { usePushNotifications } from './hooks/usePushNotifications';
import InAppNotificationManager from './components/InAppNotificationManager';

// Wrapper to force ChatDetailScreen remount on navigation
function ChatDetailScreenWrapper() {
  const location = useLocation();
  // Use full location (pathname + search) as key to force remount when query params change
  return <ChatDetailScreen key={location.pathname + location.search} />;
}

// Component to handle Android back button
function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let backButtonListener;

    const setupBackButton = async () => {
      backButtonListener = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        console.log('📱 Android back button pressed');
        console.log('📍 Current path:', location.pathname);
        console.log('🔙 Can go back:', canGoBack);

        // Define routes where back button should exit the app
        const exitRoutes = ['/chats', '/login', '/splash'];

        if (exitRoutes.includes(location.pathname)) {
          console.log('🚪 On exit route, closing app');
          CapacitorApp.exitApp();
        } else if (location.pathname.startsWith('/chat/')) {
          // ChatDetailScreen always goes to /chats
          console.log('💬 In chat detail, navigating to /chats');
          navigate('/chats');
        } else if (canGoBack) {
          console.log('⬅️ Navigating back');
          navigate(-1);
        } else {
          console.log('🚪 Cannot go back, closing app');
          CapacitorApp.exitApp();
        }
      });
    };

    setupBackButton();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [navigate, location]);

  return null;
}

// Inner component that uses Push notifications (Web + Mobile)
function AppContent({ currentUserId }) {
  // Initialize Push notifications (works for both web and mobile)
  const { fcmToken, isNative } = usePushNotifications();

  // Send FCM token to backend when user is logged in (with retry logic)
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout = null;

    const sendTokenToBackend = async () => {
      if (!fcmToken || !currentUserId) {
        console.log('⏳ Waiting for FCM token or userId...', { fcmToken: !!fcmToken, currentUserId: !!currentUserId });
        return;
      }

      console.log('📤 Sending FCM token to backend:', fcmToken);
      console.log('📤 User ID:', currentUserId);
      console.log('📤 Attempt:', retryCount + 1);

      try {
        const accessToken = StorageService.getAccessToken();

        if (!accessToken) {
          console.error('❌ No access token available');
          return;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.200:8008/api/v1';

        const response = await fetch(`${API_BASE_URL}/users/set/fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            token: fcmToken
          }),
          timeout: 10000 // 10 second timeout
        });

        if (response.ok) {
          try {
            const data = await response.json();
            console.log('✅ FCM token sent to backend successfully:', data);
            // Store success flag in user data
            StorageService.updateUserData(currentUserId, {
              fcmTokenSent: true,
              lastFcmToken: fcmToken,
              fcmToken: fcmToken
            });
          } catch (jsonError) {
            console.warn('⚠️ Failed to parse FCM token response:', jsonError);
            // Still consider it success if response was OK
            StorageService.updateUserData(currentUserId, {
              fcmTokenSent: true,
              lastFcmToken: fcmToken,
              fcmToken: fcmToken
            });
          }
        } else {
          try {
            const errorText = await response.text();
            console.error('❌ Failed to send FCM token to backend:', response.status, errorText);

            // Retry if not max retries
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`🔄 Retrying FCM token send (${retryCount}/${maxRetries})...`);
              retryTimeout = setTimeout(sendTokenToBackend, retryCount * 2000); // Progressive delay: 2s, 4s, 6s
            }
          } catch (textError) {
            console.error('❌ Failed to send FCM token to backend:', response.status);
          }
        }
      } catch (error) {
        console.error('❌ Error sending FCM token to backend:', error);

        // Retry if not max retries
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Retrying FCM token send (${retryCount}/${maxRetries})...`);
          retryTimeout = setTimeout(sendTokenToBackend, retryCount * 2000); // Progressive delay: 2s, 4s, 6s
        } else {
          console.error('❌ Failed to send FCM token after', maxRetries, 'attempts');
        }
      }
    };

    // Check if token was already sent
    const userData = StorageService.getUserData(currentUserId);
    const lastSentToken = userData?.lastFcmToken;
    const tokenSent = userData?.fcmTokenSent;

    if (fcmToken && currentUserId) {
      // Only send if token is different or wasn't sent before
      if (lastSentToken !== fcmToken || tokenSent !== true) {
        console.log('🚀 FCM token needs to be sent to backend');
        sendTokenToBackend();
      } else {
        console.log('✅ FCM token already sent to backend');
      }
    } else if (currentUserId && !fcmToken) {
      // User is logged in but FCM token not ready yet
      console.log('⏳ User logged in, waiting for FCM token...');
    }

    // Cleanup timeout on unmount
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [fcmToken, currentUserId]);

  // Listen for user login events to send FCM token
  useEffect(() => {
    const handleUserLogin = () => {
      console.log('👤 User logged in event detected');

      // Store a flag to indicate we need to send FCM token
      sessionStorage.setItem('needToSendFCM', 'true');
    };

    window.addEventListener('userLoggedIn', handleUserLogin);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLogin);
    };
  }, []);

  // Check if we need to send FCM token after login
  useEffect(() => {
    const needToSend = sessionStorage.getItem('needToSendFCM');

    if (needToSend === 'true' && fcmToken && currentUserId) {
      console.log('🚀 Sending FCM token after login event');
      sessionStorage.removeItem('needToSendFCM');

      // Force update user data to trigger sending
      const userData = StorageService.getUserData(currentUserId);
      if (userData) {
        StorageService.updateUserData(currentUserId, {
          fcmTokenSent: false, // Reset flag to force sending
          fcmToken: fcmToken
        });
      }
    }
  }, [fcmToken, currentUserId]);

  return (
    <WebSocketProvider>
      <CallProvider currentUserId={currentUserId}>
        <Router>
          <NotificationProvider>
            <BackButtonHandler />
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
              <Route path="/chat/:id" element={<ChatDetailScreenWrapper />} />
              <Route path="/call-history" element={<CallHistoryScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/camera" element={<CameraScreen />} />
              <Route path="/user-profile/:userId" element={<UserProfileScreen />} />
              <Route path="/ios" element={<IosInstallGuide />} />
              <Route path="/debug" element={<DebugScreen />} />
            </Routes>
          </NotificationProvider>
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

      // Migrate old storage format to new format (one-time operation)
      try {
        const migrated = ApiUtils.migrateStorage();
        if (migrated) {
          console.log('✅ Storage migrated to new format');
        }
      } catch (error) {
        console.error('Failed to migrate storage:', error);
      }

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