import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WEBSOCKET_URL = "https://9qkz9glq-8008.inc1.devtunnels.ms/ws";

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
    debug: true,
    enabled: true, // Default to enabled
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

  const resubscribeAll = useCallback(() => {
    if (!clientRef.current?.connected) return;

    const subscriptions = Array.from(subscriptionsRef.current.entries());
    subscriptionsRef.current.clear();

    subscriptions.forEach(([destination, callback]) => {
      subscribe(destination, callback);
    });
  }, []);

  const connect = useCallback(async () => {
    if (clientRef.current?.connected || connecting) {
      log("Already connected or connecting");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      // Get userId from localStorage for presence tracking
      const userId = localStorage.getItem("userId");
      const connectHeaders = userId ? { userId: userId } : {};

      const client = new Client({
        webSocketFactory: () => new SockJS(WEBSOCKET_URL),
        connectHeaders: connectHeaders,
        debug: config.debug ? (str) => log(str, "debug") : undefined,
        reconnectDelay: 5000,
        heartbeatIncoming: 20000,
        heartbeatOutgoing: 20000,
      });

      client.onConnect = (frame) => {
        log("✅ Connected to STOMP server");
        setConnected(true);
        setConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        resubscribeAll();
      };

      client.onStompError = (frame) => {
        const errorMsg = `STOMP error: ${frame.headers.message}`;
        log(errorMsg, "error");
        console.error("❌ STOMP ERROR:", frame);
        setError(errorMsg);
        setConnecting(false);
      };

      client.onWebSocketError = (error) => {
        const errorMsg = `WebSocket error: ${error.message}`;
        log(errorMsg, "error");
        console.error("❌ WEBSOCKET ERROR:", error);
        setError(errorMsg);
        setConnecting(false);
      };

      client.onDisconnect = (frame) => {
        log("Disconnected from STOMP server");
        setConnected(false);
        setConnecting(false);

        if (
          config.maxReconnectAttempts > 0 &&
          reconnectAttemptsRef.current < config.maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current += 1;
          const delay = config.reconnectInterval * reconnectAttemptsRef.current;
          log(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${config.maxReconnectAttempts})`
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      clientRef.current = client;
      client.activate();
    } catch (error) {
      log(`Connection failed: ${error.message}`, "error");
      console.error("❌ Connection failed:", error);
      setError(`Connection failed: ${error.message}`);
      setConnecting(false);
    }
  }, [config, log, connecting, resubscribeAll]);

  const disconnect = useCallback(() => {
    log("Disconnecting from STOMP server");

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    subscriptionsRef.current.clear();

    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }

    setConnected(false);
    setConnecting(false);
    reconnectAttemptsRef.current = 0;
  }, [log]);

  const subscribe = useCallback(
    (destination, callback) => {
      if (!clientRef.current?.connected) {
        log(`Cannot subscribe to ${destination} - not connected`);
        subscriptionsRef.current.set(destination, callback);
        return null;
      }

      try {
        const subscription = clientRef.current.subscribe(
          destination,
          (message) => {
            try {
              log(`Message received from ${destination}`);

              // Check content-type header
              const contentType = message.headers?.["content-type"] || "";
              let parsedMessage;

              // If it's plain text, don't parse as JSON
              if (contentType.includes("text/plain")) {
                parsedMessage = message.body; // Use raw text
                log(`Plain text message: ${parsedMessage}`);

                // Call callback with raw message for plain text
                if (callback) {
                  callback(parsedMessage, message);
                }
                return;
              }

              // Try to parse as JSON
              parsedMessage = JSON.parse(message.body);

              let actualMessage = parsedMessage;
              if (
                parsedMessage.data &&
                typeof parsedMessage.data === "object"
              ) {
                actualMessage = parsedMessage.data;
              }

              const enhancedMessage = {
                ...actualMessage,
                id:
                  actualMessage.chatMessageId ||
                  actualMessage.id ||
                  actualMessage.messageId,
                timestamp:
                  actualMessage.sentAt ||
                  actualMessage.timestamp ||
                  new Date().toISOString(),
                content:
                  actualMessage.content ||
                  actualMessage.message ||
                  actualMessage.text ||
                  "",
                senderId: actualMessage.senderId,
                senderName: actualMessage.senderName,
                chatRoomId: actualMessage.chatRoomId,
              };

              setLastMessage(enhancedMessage);
              setMessages((prev) => [...prev, enhancedMessage]);

              if (callback) {
                callback(enhancedMessage, message);
              }
            } catch (parseError) {
              log(
                `Failed to parse message from ${destination}: ${parseError.message}`,
                "error"
              );

              // If JSON parsing fails, try calling callback with raw body
              if (callback) {
                callback(message.body, message);
              }
            }
          }
        );

        subscriptionsRef.current.set(destination, callback);
        log(`✅ Subscribed to ${destination}`);
        return subscription;
      } catch (error) {
        log(`Failed to subscribe to ${destination}: ${error.message}`, "error");
        return null;
      }
    },
    [log]
  );

  const unsubscribe = useCallback(
    (destination) => {
      subscriptionsRef.current.delete(destination);
      log(`Unsubscribed from ${destination}`);
    },
    [log]
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
      // Build the payload with all fields from messageData
      const payload = {
        content: messageData.content,
        messageType: messageData.messageType || "TEXT",
        timestamp: new Date().toISOString(),
        senderId,
        receiverId,
        chatRoomId,
        replyToId: messageData.replyToId || null,
        attachments: messageData.attachments || [],
      };

      return publish(destination, payload);
    },
    [publish]
  );

  const subscribeToChat = useCallback(
    (chatRoomId, receiverId, callback) => {
      const destination = `/topic/chat/${chatRoomId}/${receiverId}`;
      return subscribe(destination, callback);
    },
    [subscribe]
  );

  const sendTypingIndicator = useCallback(
    (chatRoomId, senderId, receiverId, isTyping = true) => {
      const destination = `/app/chat/${chatRoomId}/typing/${senderId}/${receiverId}`;
      return publish(destination, {
        typing: isTyping,
        timestamp: new Date().toISOString(),
      });
    },
    [publish]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
    log("Messages cleared");
  }, [log]);

  // Initialize connection only once
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!config.enabled) {
      hasInitializedRef.current = false;
      return;
    }

    // Prevent multiple initializations
    if (hasInitializedRef.current) {
      return;
    }

    // Only connect if not already connected or connecting
    if (!clientRef.current?.connected && !connecting) {
      hasInitializedRef.current = true;
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled]); // Only depend on enabled flag

  // Handle browser tab visibility changes (sleep/wake)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && config.enabled) {
        // If not connected, reconnect
        if (!clientRef.current?.connected && !connecting) {
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled]); // Don't include connect to avoid infinite loops

  // Periodic stale connection check (every 30 seconds)
  useEffect(() => {
    if (!config.enabled) return;

    const interval = setInterval(() => {
      if (clientRef.current && !clientRef.current.connected && !connecting) {
        connect();
      }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.enabled, connecting]); // Don't include connect to avoid infinite loops

  return {
    connected,
    connecting,
    error,
    messages,
    lastMessage,
    clearMessages,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    publish,
    sendMessage,
    subscribeToChat,
    sendTypingIndicator,
    reconnectAttempts: reconnectAttemptsRef.current,
    subscriptionCount: subscriptionsRef.current.size,
  };
}
