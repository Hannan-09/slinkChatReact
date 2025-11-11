// ChatApiService.js - API service for chat backend integration

// Base API configuration
const API_CONFIG = {
  development: {
    baseUrl: "http://192.168.0.189:8008/api/v1",
  },
  staging: {
    baseUrl: "http://192.168.0.189:8008/api/v1",
  },
  production: {
    baseUrl: "http://192.168.0.189:8008/api/v1",
  },
};

// Get current environment
const getCurrentEnvironment = () => {
  return import.meta.env.DEV ? "development" : "production";
};

const getApiConfig = () => {
  const env = getCurrentEnvironment();
  return API_CONFIG[env];
};

// API service class
class ChatApiService {
  constructor() {
    this.config = getApiConfig();
    this.baseUrl = this.config.baseUrl;
  }

  // Generic fetch method with error handling
  async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Chat Request APIs
  async createChatRequest(senderId, receiverId, requestData) {
    const url = `${this.baseUrl}/chat/requests/create/${senderId}/${receiverId}`;
    return this.fetchWithErrorHandling(url, {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  }

  async acceptChatRequest(chatRequestId, receiverId) {
    const url = `${this.baseUrl}/chat/requests/accept/${chatRequestId}/${receiverId}`;
    return this.fetchWithErrorHandling(url, {
      method: "POST",
    });
  }

  async rejectChatRequest(chatRequestId, receiverId) {
    const url = `${this.baseUrl}/chat/requests/reject/${chatRequestId}/${receiverId}`;
    return this.fetchWithErrorHandling(url, {
      method: "POST",
    });
  }

  async getAllChatRequests(userId, options = {}) {
    const {
      chatRequestStatus = "PENDING",
      pageNumber = 1,
      size = 10,
      sortBy = "createdAt",
      sortDirection = "desc",
    } = options;

    const params = new URLSearchParams({
      chatRequestStatus,
      pageNumber: pageNumber.toString(),
      size: size.toString(),
      sortBy,
      sortDirection,
    });

    const url = `${this.baseUrl}/chat/requests/get-all/${userId}?${params}`;
    return this.fetchWithErrorHandling(url);
  }

  async deleteChatRequest(chatRequestId, senderId) {
    const url = `${this.baseUrl}/chat/requests/delete/${chatRequestId}/${senderId}`;
    return this.fetchWithErrorHandling(url, {
      method: "DELETE",
    });
  }

  // Chat Room APIs
  async getAllChatRooms(userId, options = {}) {
    const {
      pageNumber = 1,
      size = 10,
      sortBy = "createdAt",
      sortDirection = "desc",
    } = options;

    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      size: size.toString(),
      sortBy,
      sortDirection,
    });

    const url = `${this.baseUrl}/chat/rooms/get-all/${userId}?${params}`;
    console.log("Making API request to:", url);
    return this.fetchWithErrorHandling(url);
  }

  async getChatRoomMessages(chatRoomId, userId, options = {}) {
    const { pageNumber = 1, size = 1000, sortBy = "sentAt" } = options;

    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      size: size.toString(),
      sortBy,
    });

    const url = `${this.baseUrl}/chat/rooms/messages/${chatRoomId}/${userId}?${params}`;
    console.log("Making API request to:", url);
    return this.fetchWithErrorHandling(url);
  }

  // Send message via API (fallback if WebSocket fails)
  async sendMessage(chatRoomId, senderId, receiverId, messageData) {
    const url = `${this.baseUrl}/chat/rooms/messages/send`;

    console.log("Sending message via API:", {
      chatRoomId,
      senderId,
      receiverId,
      messageData,
    });

    return this.fetchWithErrorHandling(url, {
      method: "POST",
      body: JSON.stringify({
        chatRoomId,
        senderId,
        receiverId,
        content: messageData.content,
        messageType: messageData.messageType || "TEXT",
      }),
    });
  }

  // Mark messages as read
  async markMessagesAsRead(chatRoomId, userId, messageIds) {
    const url = `${this.baseUrl}/chat/rooms/messages/mark-read`;

    console.log("Marking messages as read:", {
      chatRoomId,
      userId,
      messageIds,
    });

    return this.fetchWithErrorHandling(url, {
      method: "POST",
      body: JSON.stringify({
        chatRoomId,
        userId,
        messageIds,
      }),
    });
  }
}

// Create and export singleton instance
const chatApiService = new ChatApiService();
export default chatApiService;

// Export individual methods for convenience
export const {
  createChatRequest,
  acceptChatRequest,
  rejectChatRequest,
  getAllChatRequests,
  deleteChatRequest,
  getAllChatRooms,
  getChatRoomMessages,
} = chatApiService;
