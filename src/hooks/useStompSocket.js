import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const WEBSOCKET_URL = "http://192.168.0.189:8008/ws";

export default function useStompSocket(options = {}) {
  console.log("🚀 useStompSocket HOOK CALLED with options:", options);

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
      console.log("=== WEBSOCKET CONNECTION ATTEMPT ===");
      console.log("WebSocket URL:", WEBSOCKET_URL);
      console.log("=== END CONNECTION ATTEMPT ===");

      const client = new Client({
        webSocketFactory: () => new SockJS(WEBSOCKET_URL),
        connectHeaders: {},
        debug: config.debug ? (str) => log(str, "debug") : undefined,
        reconnectDelay: config.reconnectInterval,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
      });

      client.onConnect = (frame) => {
        log("✅ Connected to STOMP server");
        console.log("✅ WebSocket Connected Successfully!");
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
        console.log("⚠️ WebSocket Disconnected");
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
      console.log("🔌 Activating WebSocket client...");
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
                  actualMessage.messageId ||
                  `ws-${Date.now()}-${Math.random()}`,
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
      console.log("📤 Sending message to:", destination);

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

      console.log(
        "📤 Full payload being sent:",
        JSON.stringify(payload, null, 2)
      );

      return publish(destination, payload);
    },
    [publish]
  );

  const subscribeToChat = useCallback(
    (chatRoomId, receiverId, callback) => {
      const destination = `/topic/chat/${chatRoomId}/${receiverId}`;
      console.log("📡 Subscribing to chat:", destination);
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
  const isInitializedRef = useRef(false);

  useEffect(() => {
    console.log(
      "🔌 useStompSocket: Effect triggered - enabled:",
      config.enabled,
      "initialized:",
      isInitializedRef.current
    );

    // Don't connect if disabled
    if (!config.enabled) {
      console.log("🔌 useStompSocket: Disabled, skipping connection...");
      // Reset initialization flag when disabled so it can connect when enabled
      isInitializedRef.current = false;
      return;
    }

    // Prevent double initialization
    if (isInitializedRef.current) {
      console.log("🔌 useStompSocket: Already initialized, skipping...");
      return;
    }

    console.log("🔌 useStompSocket: Initializing connection...");

    if (clientRef.current?.connected || connecting) {
      console.log("Already connected or connecting, skipping...");
      return;
    }

    isInitializedRef.current = true;
    setConnecting(true);
    setError(null);

    // Get userId from localStorage for presence tracking
    const userId = localStorage.getItem("userId");
    const connectHeaders = userId ? { userId: userId } : {};
    console.log("Connecting with headers:", connectHeaders);

    const client = new Client({
      webSocketFactory: () => new SockJS(WEBSOCKET_URL),
      connectHeaders: connectHeaders,
      debug: config.debug
        ? (str) => console.log(`[STOMP DEBUG]:`, str)
        : undefined,
      reconnectDelay: 0, // Disable auto-reconnect
      heartbeatIncoming: 20000, // Expect server heartbeat every 20 seconds
      heartbeatOutgoing: 20000, // Send client heartbeat every 20 seconds
    });

    client.onConnect = () => {
      console.log("✅ WebSocket Connected Successfully!");
      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    client.onStompError = (frame) => {
      console.error("❌ STOMP ERROR:", frame);
      setError(`STOMP error: ${frame.headers?.message || "Unknown error"}`);
      setConnecting(false);
    };

    client.onWebSocketError = (evt) => {
      console.error("❌ WEBSOCKET ERROR:", evt);
      setError("WebSocket connection error");
      setConnecting(false);
    };

    client.onDisconnect = () => {
      console.log("⚠️ WebSocket Disconnected");
      setConnected(false);
      setConnecting(false);
    };

    clientRef.current = client;
    console.log("🔌 Activating WebSocket client...");
    client.activate();

    return () => {
      console.log("🧹 useStompSocket: Cleaning up on unmount...");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Disconnect when app closes
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [config.enabled]); // React to enabled flag changes

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
