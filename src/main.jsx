import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import '../firebase.js' // Initialize Firebase

// Register Service Worker for Firebase Cloud Messaging
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('✅ Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('❌ Service Worker registration failed:', error);
    });
}

createRoot(document.getElementById('root')).render(
  <App />
)
