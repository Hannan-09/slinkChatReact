import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Initialize Firebase asynchronously (non-blocking)
// Wrap in try-catch to prevent crashes
try {
  import('../firebase.js')
    .then(() => {
      console.log('✅ Firebase initialized');
    })
    .catch((error) => {
      console.warn('⚠️ Firebase initialization failed:', error.message);
      // Don't crash app if Firebase fails
    });
} catch (error) {
  console.warn('⚠️ Firebase import failed:', error.message);
}

// Register Service Worker for Firebase Cloud Messaging (skip on iOS in dev)
// Wrap in try-catch to prevent crashes
try {
  if ('serviceWorker' in navigator && !window.location.hostname.includes('192.168')) {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch((error) => {
        console.warn('⚠️ Service Worker registration failed:', error.message);
        // Don't crash app if service worker fails
      });
  }
} catch (error) {
  console.warn('⚠️ Service Worker not supported:', error.message);
}

// Add global error handler for debugging
window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
  // Prevent app crash
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  // Prevent app crash
  event.preventDefault();
});

// Wrap root render in try-catch with ErrorBoundary
try {
  const root = document.getElementById('root');
  if (root) {
    createRoot(root).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } else {
    console.error('❌ Root element not found');
    document.body.innerHTML = '<div style="color: white; padding: 20px; text-align: center; background: #1a1a1a; height: 100vh; display: flex; align-items: center; justify-content: center;">Root element not found. Please refresh.</div>';
  }
} catch (error) {
  console.error('❌ Failed to render app:', error);
  // Show error message to user
  document.body.innerHTML = '<div style="color: white; padding: 20px; text-align: center; background: #1a1a1a; height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;"><h2>App failed to load</h2><p>Please restart the app</p><button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; background: #333; color: white; border: 1px solid #555; border-radius: 5px; cursor: pointer;">Reload</button></div>';
}
