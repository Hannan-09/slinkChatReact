// AuthService.js - Complete API integration for Spring Boot backend
import axios from "axios";

// API Configuration
const API_CONFIG = {
  development: {
    baseURL:
      import.meta.env.VITE_API_BASE_URL || "http://192.168.0.200:8008/api/v1",
    timeout: import.meta.env.VITE_API_TIMEOUT || 10000,
  },
  production: {
    baseURL:
      import.meta.env.VITE_API_BASE_URL || "http://192.168.0.200:8008/api/v1",
    timeout: import.meta.env.VITE_API_TIMEOUT || 15000,
  },
};

const isDevelopment = import.meta.env.DEV;
const config = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// Create axios instance
const apiClient = axios.create({
  baseURL: config.baseURL,
  timeout: config.timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token management
let authToken = null;

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Skip token for login and register endpoints
    const isPublicEndpoint =
      config.url?.includes("/users/login") ||
      config.url?.includes("/users/register");

    if (!isPublicEndpoint) {
      // Try both authToken and accessToken for compatibility
      if (!authToken) {
        authToken =
          localStorage.getItem("authToken") ||
          localStorage.getItem("accessToken");
      }

      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
        console.log("🔑 JWT token added to request:", config.url);
      } else {
        console.warn("⚠️ No JWT token available for:", config.url);
      }
    } else {
      console.log("🔓 Public endpoint, skipping token:", config.url);
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error("API Error:", error.response?.status, error.response?.data);

    // Handle 401 Unauthorized - token expired
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      authToken = null;
      // You can add navigation to login screen here
    }

    return Promise.reject(error);
  }
);

// Auth API endpoints
export const AuthAPI = {
  // Login user
  login: async (email, password) => {
    try {
      const response = await apiClient.post("/users/login", {
        username: email,
        password: password,
      });
      if (response.data && response.data.statusCode === 200) {
        const userData = response.data.data;

        try {
          // Store JWT token (store as both authToken and accessToken for compatibility)
          if (userData.token) {
            localStorage.setItem("authToken", userData.token);
            localStorage.setItem("accessToken", userData.token);
            authToken = userData.token;
          }

          // Store user data in localStorage
          localStorage.setItem("user", JSON.stringify(userData));
          localStorage.setItem("userId", userData.userId.toString());
          localStorage.setItem("username", userData.username);
          localStorage.setItem("firstName", userData.firstName || "");
          localStorage.setItem("lastName", userData.lastName || "");
          localStorage.setItem("isLoggedIn", "true");

          // Verify storage
          const storedUserId = localStorage.getItem("userId");
          const storedUser = localStorage.getItem("user");
        } catch (storageError) {
          console.error("Storage error:", storageError);
        }
      }

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Login failed",
      };
    }
  },

  // Update user profile
  updateProfile: async (userId, firstName, lastName, profileImage) => {
    try {
      const formData = new FormData();
      formData.append("userId", userId);
      if (firstName) formData.append("firstName", firstName);
      if (lastName) formData.append("lastName", lastName);
      if (profileImage) formData.append("profileImage", profileImage);

      const response = await apiClient.put("/users/update-profile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Update localStorage with new data
      if (response.data && response.data.statusCode === 200) {
        const userData = response.data.data;
        localStorage.setItem("user", JSON.stringify(userData));
        if (userData.firstName)
          localStorage.setItem("firstName", userData.firstName);
        if (userData.lastName)
          localStorage.setItem("lastName", userData.lastName);
      }

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update profile",
      };
    }
  },

  // Update password
  updatePassword: async (userId, oldPassword, newPassword) => {
    try {
      const response = await apiClient.patch("/users/update-password", {
        oldPassword,
        newPassword,
      });

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update password",
      };
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const response = await apiClient.post("/users/register", userData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Registration failed",
      };
    }
  },

  // Logout user
  logout: async () => {
    try {
      await apiClient.post("/auth/logout");

      // Clear stored data
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("isLoggedIn");

      authToken = null;
      return { success: true };
    } catch (error) {
      // Clear local data even if API call fails
      localStorage.removeItem("authToken");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("username");
      localStorage.removeItem("isLoggedIn");

      authToken = null;
      return { success: true };
    }
  },

  // Refresh token
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await apiClient.post("/auth/refresh", {
        refreshToken,
      });

      const { token } = response.data;
      localStorage.setItem("authToken", token);
      authToken = token;

      return { success: true, token };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Token refresh failed",
      };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get("/auth/me");
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get user",
      };
    }
  },

  // Register private key for user
  registerPrivateKey: async (userId, encryptedPrivateKey) => {
    try {
      const response = await apiClient.post(
        `/users/register/private-key/${userId}?pvt-key=${encryptedPrivateKey}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Private key registration error:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Failed to register private key",
      };
    }
  },
};

// User API endpoints
export const UserAPI = {
  // Get user profile (userId from JWT token or specific userId for other users)
  getProfile: async (userId = null) => {
    try {
      // If userId provided, get that user's profile, otherwise get own profile from JWT
      const endpoint = userId ? `/users/get-profile` : `/users/get-profile`;
      const response = await apiClient.get(endpoint);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get profile",
      };
    }
  },

  // Update user profile (userId from JWT token)
  updateProfile: async (profileData) => {
    try {
      const response = await apiClient.put(
        `/users/update-profile`,
        profileData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update profile",
      };
    }
  },

  // Search users (userId from JWT token)
  searchUsers: async (searchText, pageNumber = 1, size = 10) => {
    try {
      const endpoint = `/users/search/${encodeURIComponent(
        searchText
      )}?pageNumber=${pageNumber}&size=${size}`;
      const response = await apiClient.get(endpoint);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("=== SEARCH USERS API ERROR ===");
      console.error("Error:", error);
      console.error("Error response:", error.response?.data);
      console.error("=== END SEARCH ERROR ===");

      return {
        success: false,
        error: error.response?.data?.message || "Search failed",
      };
    }
  },

  // Get user friends
  getFriends: async () => {
    try {
      const response = await apiClient.get("/users/friends");
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get friends",
      };
    }
  },
};

// Chat Request API endpoints
export const ChatRequestAPI = {
  // Create chat request (senderId from JWT token)
  createChatRequest: async (receiverId, requestData) => {
    try {
      const endpoint = `/chat/requests/create/${receiverId}`;
      const response = await apiClient.post(endpoint, requestData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("=== CHAT REQUEST API ERROR ===");
      console.error("Error:", error);
      console.error("Error response:", error.response?.data);
      console.error("=== END ERROR ===");

      return {
        success: false,
        error: error.response?.data?.message || "Failed to send chat request",
      };
    }
  },

  // Accept chat request (receiverId from JWT token)
  acceptChatRequest: async (chatRequestId) => {
    try {
      const response = await apiClient.post(
        `/chat/requests/accept/${chatRequestId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to accept chat request",
      };
    }
  },

  // Reject chat request (receiverId from JWT token)
  rejectChatRequest: async (chatRequestId) => {
    try {
      const response = await apiClient.post(
        `/chat/requests/reject/${chatRequestId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to reject chat request",
      };
    }
  },

  // Get all chat requests by user (userId from JWT token)
  getAllChatRequests: async (
    chatRequestStatus = "PENDING",
    type = "sent",
    pageNumber = 1,
    size = 10,
    sortBy = "createdAt",
    sortDirection = "desc"
  ) => {
    try {
      const endpoint = `/chat/requests/get-all?chatRequestStatus=${chatRequestStatus}&type=${type}&pageNumber=${pageNumber}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
      const response = await apiClient.get(endpoint);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Chat requests API error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get chat requests",
      };
    }
  },

  // Delete chat request (senderId from JWT token)
  deleteChatRequest: async (chatRequestId) => {
    try {
      const response = await apiClient.delete(
        `/chat/requests/delete/${chatRequestId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete chat request",
      };
    }
  },
};

// Chat API endpoints
export const ChatAPI = {
  // Get user chats
  getChats: async () => {
    try {
      const response = await apiClient.get("/chats");
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get chats",
      };
    }
  },

  // Get chat messages
  getChatMessages: async (chatId, page = 0, size = 50) => {
    try {
      const response = await apiClient.get(
        `/chats/${chatId}/messages?page=${page}&size=${size}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get messages",
      };
    }
  },

  // Create new chat
  createChat: async (participantIds, chatName = null) => {
    try {
      const response = await apiClient.post("/chats", {
        participantIds,
        chatName,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to create chat",
      };
    }
  },

  // Send message
  sendMessage: async (chatId, messageData) => {
    try {
      const response = await apiClient.post(
        `/chats/${chatId}/messages`,
        messageData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to send message",
      };
    }
  },

  // Mark messages as read
  markAsRead: async (chatId, messageIds) => {
    try {
      const response = await apiClient.post(`/chats/${chatId}/read`, {
        messageIds,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to mark as read",
      };
    }
  },

  // Delete message
  deleteMessage: async (chatId, messageId) => {
    try {
      const response = await apiClient.delete(
        `/chats/${chatId}/messages/${messageId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete message",
      };
    }
  },

  // Update message
  updateMessage: async (chatId, messageId, newContent) => {
    try {
      const response = await apiClient.put(
        `/chats/${chatId}/messages/${messageId}`,
        {
          content: newContent,
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update message",
      };
    }
  },
};

// File upload API
export const FileAPI = {
  // Upload file
  uploadFile: async (file, type = "image") => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await apiClient.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || "File upload failed",
      };
    }
  },

  // Get file URL
  getFileUrl: (fileId) => {
    return `${config.baseURL}/files/${fileId}`;
  },
};

// Utility functions
export const ApiUtils = {
  // Check if user is authenticated
  isAuthenticated: async () => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    return isLoggedIn === "true";
  },

  // Get stored user data
  getStoredUser: async () => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error getting stored user:", error);
      return null;
    }
  },

  // Get current user ID
  getCurrentUserId: async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        return null;
      }

      const parsedUserId = parseInt(userId);
      if (isNaN(parsedUserId)) {
        return null;
      }
      return parsedUserId;
    } catch (error) {
      console.error("Error getting userId from storage:", error);
      return null;
    }
  },

  // Get current username
  getCurrentUsername: async () => {
    return localStorage.getItem("username");
  },

  // Clear all stored data
  clearStorage: async () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("isLoggedIn");
    authToken = null;
  },
};

export default apiClient;
