import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WebSocketProvider } from './contexts/WebSocketContext';
import CallListener from './components/CallListener';
import LoginScreen from './pages/LoginScreen';
import SignupScreen from './pages/SignupScreen';
import ChatsScreen from './pages/ChatsScreen';
import FriendsScreen from './pages/FriendsScreen';
import RequestsScreen from './pages/RequestsScreen';
import ChatDetailScreen from './pages/ChatDetailScreen';
import IncomingCallScreen from './pages/call/IncomingCallScreen';
import OutgoingCallScreen from './pages/call/OutgoingCallScreen';
import ActiveCallScreen from './pages/call/ActiveCallScreen';

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <CallListener />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupScreen />} />
          <Route path="/chats" element={<ChatsScreen />} />
          <Route path="/friends" element={<FriendsScreen />} />
          <Route path="/requests" element={<RequestsScreen />} />
          <Route path="/chat/:id" element={<ChatDetailScreen />} />
          <Route path="/call/incoming" element={<IncomingCallScreen />} />
          <Route path="/call/outgoing" element={<OutgoingCallScreen />} />
          <Route path="/call/active" element={<ActiveCallScreen />} />
        </Routes>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
