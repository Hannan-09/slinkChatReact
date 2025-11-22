import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Initialize Firebase asynchronously (non-blocking)
import('../firebase.js')
  .then(() => {
    console.log('✅ Firebase initialized');
  })
  .catch((error) => {
    console.error('❌ Firebase initialization failed:', error);
  });

// Register Service Worker for Firebase Cloud Messaging (skip on iOS in dev)
if ('serviceWorker' in navigator && !window.location.hostname.includes('192.168')) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('✅ Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('❌ Service Worker registration failed:', error);
    });
}

// Add global error handler for debugging
window.addEventListener('error', (event) => {
  console.error('❌ Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

createRoot(document.getElementById('root')).render(
  <App />
)
