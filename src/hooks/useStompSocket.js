import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WEBSOCKET_CONFIG = {
  development: {
    url: "http://192.168.0.189:8008/ws",
  },
  production: {
    url: "http://192.168.0.189:8008/ws",
  },
};

const isDevelopment = import.meta.env.DEV;

export default function useStompSocket(options = {}) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);

  const clientRef = useRef(null);
  const subscriptionsRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const config = {
    maxReconnectAttempts: 5,
    reconnectInterval: 3000,
    debug: isDevelopment,
    ...options,
  };

  const log = useCallback(
    (message, type = "info") => {
      if (config.debug) {
        console.log(`[STOMP ${type.toUpperCase()}]:`, message);
      }
    },
    [config.debug]
  );

  const publish = useCallback(
    (destination, body, headers = {}) => {
      if (!clientRef.current?.connected) {
        log(`Cannot publish to ${destination} - not connected`, "warn");
        return false;
      }

      try {
        clientRef.current.publish({
          destination,
          body: JSON.stringify(body),
          headers,
        });
        log(`Message published to ${destination}`);
        return true;
      } catch (error) {
        log(`Failed to publish to ${destination}: ${error.message}`, "error");
        return false;
      }
    },
    [log]
  );

  const sendMessage = useCallback(
    (chatRoomId, senderId, receiverId, messageData) => {
      const destination = `/app/chat/${chatRoomId}/${senderId}/${receiverId}`;
      return publish(destination, {
        content: messageData.content,
        messageType: messageData.messageType || "TEXT",
        timestamp: new Date().toISOString(),
        senderId,
        receiverId,
        chatRoomId,
      });
    },
    [publish]
  );

  return {
    connected,
    connecting,
    error,
    messages,
    lastMessage,
    sendMessage,
    publish,
  };
}
