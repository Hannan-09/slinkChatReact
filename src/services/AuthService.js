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
    "ngrok-skip-browser-warning": "1",
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
    // Better error logging for debugging
    if (error.response) {
      // Server responded with error status
      console.error("API Error Response:", {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      // Request was made but no response received
      console.error("API No Response:", {
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      console.error("Possible causes:");
      console.error("1. Network connection issue");
      console.error("2. CORS policy blocking request");
      console.error("3. SSL certificate issue (iOS)");
      console.error("4. Server is down or unreachable");
    } else {
      // Error in request setup
      console.error("API Request Setup Error:", error.message);
    }

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
            try {
              localStorage.setItem("authToken", userData.token);
              localStorage.setItem("accessToken", userData.token);
              authToken = userData.token;
            } catch (tokenError) {
              console.error("Failed to store auth token:", tokenError);
              // Continue even if token storage fails
            }
          }

          // Store user data in localStorage with individual try-catch
          try {
            localStorage.setItem("user", JSON.stringify(userData));
          } catch (e) {
            console.warn("Failed to store user data:", e);
          }

          try {
            localStorage.setItem("userId", userData.userId.toString());
          } catch (e) {
            console.warn("Failed to store userId:", e);
          }

          try {
            localStorage.setItem("username", userData.username);
            localStorage.setItem("firstName", userData.firstName || "");
            localStorage.setItem("lastName", userData.lastName || "");
            localStorage.setItem("isLoggedIn", "true");
          } catch (e) {
            console.warn("Failed to store user details:", e);
          }

          // Verify storage
          try {
            const storedUserId = localStorage.getItem("userId");
            const storedUser = localStorage.getItem("user");
          } catch (e) {
            console.warn("Failed to verify storage:", e);
          }
        } catch (storageError) {
          console.error("Storage error:", storageError);
          // Don't crash - continue with login even if storage fails
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
        try {
          localStorage.setItem("user", JSON.stringify(userData));
        } catch (e) {
          console.warn("Failed to update user in storage:", e);
        }

        try {
          if (userData.firstName)
            localStorage.setItem("firstName", userData.firstName);
          if (userData.lastName)
            localStorage.setItem("lastName", userData.lastName);
        } catch (e) {
          console.warn("Failed to update user details in storage:", e);
        }
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
      console.log(
        "📤 Sending registration request to:",
        `${config.baseURL}/users/register`
      );
      console.log("📤 Registration data:", {
        ...userData,
        password: "[HIDDEN]",
      });

      const response = await apiClient.post("/users/register", userData);

      console.log("✅ Registration successful:", response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("❌ Registration failed:");

      let errorMessage = "Registration failed";

      if (error.response) {
        // Server responded with error
        errorMessage =
          error.response.data?.message ||
          `Server error: ${error.response.status}`;
        console.error("Server error:", error.response.data);
      } else if (error.request) {
        // No response received
        errorMessage =
          "Cannot connect to server. Please check your internet connection.";
        console.error("No response from server");
      } else {
        // Request setup error
        errorMessage = error.message || "Request failed";
        console.error("Request error:", error.message);
      }

      return {
        success: false,
        error: errorMessage,
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
      try {
        localStorage.setItem("authToken", token);
        authToken = token;
      } catch (e) {
        console.warn("Failed to store refreshed token:", e);
        authToken = token; // Still set in memory
      }

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
      const endpoint = userId
        ? `/users/get-profile/${userId}`
        : `/users/get-profile`;
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
      if (!userStr) return null;

      try {
        return JSON.parse(userStr);
      } catch (parseError) {
        console.error("Error parsing stored user:", parseError);
        // Clear corrupted data
        localStorage.removeItem("user");
        return null;
      }
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
