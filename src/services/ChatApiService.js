// ChatApiService.js - API service for chat backend integration

// Base API configuration
const API_CONFIG = {
  development: {
    baseUrl:
      import.meta.env.VITE_API_BASE_URL || "http://192.168.0.200:8008/api/v1",
    timeout: import.meta.env.VITE_API_TIMEOUT || 10000,
  },
  staging: {
    baseUrl:
      import.meta.env.VITE_API_BASE_URL || "http://192.168.0.200:8008/api/v1",
    timeout: import.meta.env.VITE_API_TIMEOUT || 10000,
  },
  production: {
    baseUrl:
      import.meta.env.VITE_API_BASE_URL || "http://192.168.0.200:8008/api/v1",
    timeout: import.meta.env.VITE_API_TIMEOUT || 15000,
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
      // Try both accessToken and authToken for compatibility
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken");

      console.log("🔑 ChatApiService - Token found:", token ? "Yes" : "No");
      console.log("🔗 ChatApiService - Request URL:", url);

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
          "ngrok-skip-browser-warning": "1",
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
    const url = `${this.baseUrl}/chat/requests/create/${receiverId}`;
    return this.fetchWithErrorHandling(url, {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  }

  async acceptChatRequest(chatRequestId, receiverId) {
    const url = `${this.baseUrl}/chat/requests/accept/${chatRequestId}`;
    return this.fetchWithErrorHandling(url, {
      method: "POST",
    });
  }

  async rejectChatRequest(chatRequestId, receiverId) {
    const url = `${this.baseUrl}/chat/requests/reject/${chatRequestId}`;
    return this.fetchWithErrorHandling(url, {
      method: "POST",
    });
  }

  async getAllChatRequests(options = {}) {
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

    const url = `${this.baseUrl}/chat/requests/get-all?${params}`;
    return this.fetchWithErrorHandling(url);
  }

  async deleteChatRequest(chatRequestId, senderId) {
    const url = `${this.baseUrl}/chat/requests/delete/${chatRequestId}`;
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

    const url = `${this.baseUrl}/chat/rooms/get-all?${params}`;
    return this.fetchWithErrorHandling(url);
  }

  async getChatRoomMessages(chatRoomId, userId, options = {}) {
    const {
      pageNumber = 1,
      size = 20,
      sortBy = "sentAt",
      sortDirection = "asc",
    } = options;

    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      size: size.toString(),
      sortBy,
      sortDirection,
    });

    const url = `${this.baseUrl}/chat/rooms/messages/${chatRoomId}?${params}`;
    return this.fetchWithErrorHandling(url);
  }

  async searchChatRooms(searchText, userId, options = {}) {
    const {
      pageNumber = 1,
      size = 10,
      sortBy = "lastMessageAt",
      sortDirection = "desc",
    } = options;

    const params = new URLSearchParams({
      pageNumber: pageNumber.toString(),
      size: size.toString(),
      sortBy,
      sortDirection,
    });

    const url = `${this.baseUrl}/chat/rooms/search/${encodeURIComponent(
      searchText
    )}?${params}`;
    return this.fetchWithErrorHandling(url);
  }

  async deleteChatRoom(chatRoomId) {
    const url = `${this.baseUrl}/chat/rooms/delete/${chatRoomId}`;
    return this.fetchWithErrorHandling(url, {
      method: "DELETE",
    });
  }

  // Lock chat room (enable encryption)
  async lockChatRoom(chatRoomId) {
    const url = `${this.baseUrl}/chat/rooms/lock/${chatRoomId}`;
    return this.fetchWithErrorHandling(url, {
      method: "PUT",
    });
  }

  // Unlock chat room (disable encryption)
  async unlockChatRoom(chatRoomId) {
    const url = `${this.baseUrl}/chat/rooms/unlock/${chatRoomId}`;
    return this.fetchWithErrorHandling(url, {
      method: "PUT",
    });
  }

  // Get encrypted users for a chat room
  async getEncryptedForUsers(chatRoomId) {
    const url = `${this.baseUrl}/chat/rooms/getEncryptedForUsers/${chatRoomId}`;
    return this.fetchWithErrorHandling(url, {
      method: "GET",
    });
  }

  // Send message via API (fallback if WebSocket fails)
  async sendMessage(chatRoomId, senderId, receiverId, messageData) {
    const url = `${this.baseUrl}/chat/rooms/messages/send`;
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
    return this.fetchWithErrorHandling(url, {
      method: "POST",
      body: JSON.stringify({
        chatRoomId,
        userId,
        messageIds,
      }),
    });
  }

  // Upload files
  async uploadFiles(formData) {
    const url = `${this.baseUrl}/chat/file-upload`;
    try {
      // Try both accessToken and authToken for compatibility
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "ngrok-skip-browser-warning": "1",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload failed:", response.status, errorText);
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("📤 Upload API response:", JSON.stringify(result, null, 2));

      // Handle different response structures
      let attachments = [];
      if (result.data && Array.isArray(result.data)) {
        attachments = result.data;
      } else if (Array.isArray(result)) {
        attachments = result;
      } else {
        console.error("❌ Unexpected response structure:", result);
        return [];
      }

      // Log each attachment for debugging
      console.log("📎 Parsed attachments from API:");
      attachments.forEach((att, idx) => {
        console.log(`  [${idx}]:`, {
          fileURL: att.fileURL,
          fileType: att.fileType,
          fullObject: att,
        });
      });

      return attachments;
    } catch (error) {
      console.error("Error uploading files:", error);
      throw error;
    }
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
