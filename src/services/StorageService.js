/**
 * Centralized Storage Service
 * Manages user data storage with userId-based keys
 * Supports multiple user accounts without clearing data on logout
 * No separate currentUserId key - determined by isLoggedIn flag
 */

export const StorageService = {
  /**
   * Get current logged-in userId by finding user with isLoggedIn: true
   */
  getCurrentUserId() {
    try {
      // Find the user with isLoggedIn: true
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Check if key is a number (userId)
        if (key && !isNaN(key)) {
          try {
            const userDataStr = localStorage.getItem(key);
            if (userDataStr) {
              const userData = JSON.parse(userDataStr);
              if (userData.isLoggedIn === true) {
                return key;
              }
            }
          } catch (e) {
            // Skip invalid entries
            continue;
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to get current userId:", error);
      return null;
    }
  },

  /**
   * Set current logged-in userId (marks user as logged in)
   */
  setCurrentUserId(userId) {
    try {
      if (!userId) {
        return false;
      }
      // Just update the user's isLoggedIn flag
      return this.updateUserData(userId, { isLoggedIn: true });
    } catch (error) {
      console.error("Failed to set current userId:", error);
      return false;
    }
  },

  /**
   * Get user data for specific userId
   */
  getUserData(userId = null) {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) return null;

      const userDataStr = localStorage.getItem(targetUserId);
      if (!userDataStr) return null;

      return JSON.parse(userDataStr);
    } catch (error) {
      console.error("Failed to get user data:", error);
      return null;
    }
  },

  /**
   * Set user data for specific userId
   */
  setUserData(userId, userData) {
    try {
      if (!userId || !userData) return false;

      const userDataStr = JSON.stringify(userData);
      localStorage.setItem(userId.toString(), userDataStr);
      return true;
    } catch (error) {
      console.error("Failed to set user data:", error);
      return false;
    }
  },

  /**
   * Update specific fields in user data
   */
  updateUserData(userId, updates) {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) return false;

      const currentData = this.getUserData(targetUserId) || {};
      const updatedData = { ...currentData, ...updates };

      return this.setUserData(targetUserId, updatedData);
    } catch (error) {
      console.error("Failed to update user data:", error);
      return false;
    }
  },

  /**
   * Get specific field from user data
   */
  getUserField(fieldName, userId = null) {
    try {
      const userData = this.getUserData(userId);
      return userData ? userData[fieldName] : null;
    } catch (error) {
      console.error(`Failed to get user field ${fieldName}:`, error);
      return null;
    }
  },

  /**
   * Set specific field in user data
   */
  setUserField(fieldName, value, userId = null) {
    try {
      const targetUserId = userId || this.getCurrentUserId();
      if (!targetUserId) return false;

      return this.updateUserData(targetUserId, { [fieldName]: value });
    } catch (error) {
      console.error(`Failed to set user field ${fieldName}:`, error);
      return false;
    }
  },

  /**
   * Get access token for current user
   */
  getAccessToken(userId = null) {
    return this.getUserField("accessToken", userId);
  },

  /**
   * Set access token for current user
   */
  setAccessToken(token, userId = null) {
    return this.setUserField("accessToken", token, userId);
  },

  /**
   * Login user - stores all user data under userId key
   */
  loginUser(userData) {
    try {
      if (!userData || !userData.userId) {
        console.error("Invalid user data for login");
        return false;
      }

      const userId = userData.userId.toString();

      // Get existing user data to preserve local-only fields
      const existingData = this.getUserData(userId) || {};

      // Prepare user data object, preserving existing local data
      const userDataToStore = {
        userId: userData.userId,
        username: userData.username,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        profileURL: userData.profileURL || "",
        status: userData.status || "ACTIVE",
        accessToken: userData.token || userData.accessToken || "",
        // Preserve existing local encryption keys if not provided by backend
        userPrivateKey:
          userData.userPrivateKey || existingData.userPrivateKey || "",
        decryptedBackendData:
          userData.decryptedBackendData ||
          existingData.decryptedBackendData ||
          "",
        encryptedPrivateKey:
          userData.encryptedPrivateKey ||
          existingData.encryptedPrivateKey ||
          "",
        fcmToken: userData.fcmToken || existingData.fcmToken || "",
        fcmTokenSent:
          userData.fcmTokenSent || existingData.fcmTokenSent || false,
        lastFcmToken: userData.lastFcmToken || existingData.lastFcmToken || "",
        isLoggedIn: true,
        permissionsGranted:
          userData.permissionsGranted ||
          existingData.permissionsGranted ||
          false,
        // Store any additional fields
        ...userData,
      };

      // Store user data under userId key
      const stored = this.setUserData(userId, userDataToStore);
      if (!stored) return false;

      // Set as current user
      this.setCurrentUserId(userId);

      console.log(`✅ User ${userId} logged in successfully`);
      console.log(`🔐 Private keys preserved:`, {
        userPrivateKey: userDataToStore.userPrivateKey ? "Present" : "Missing",
        decryptedBackendData: userDataToStore.decryptedBackendData
          ? "Present"
          : "Missing",
      });
      return true;
    } catch (error) {
      console.error("Failed to login user:", error);
      return false;
    }
  },

  /**
   * Logout user - only sets isLoggedIn to false, keeps all data
   */
  logoutUser() {
    try {
      const userId = this.getCurrentUserId();
      if (userId) {
        // Update isLoggedIn flag but keep all data
        this.updateUserData(userId, { isLoggedIn: false });
        console.log(`✅ User ${userId} logged out (data preserved)`);
      }
      return true;
    } catch (error) {
      console.error("Failed to logout user:", error);
      return false;
    }
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    const userData = this.getUserData(userId);
    return userData && userData.isLoggedIn === true;
  },

  /**
   * Get all stored user IDs
   */
  getAllUserIds() {
    try {
      const userIds = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Check if key is a number (userId)
        if (key && !isNaN(key) && key !== CURRENT_USER_KEY) {
          userIds.push(key);
        }
      }
      return userIds;
    } catch (error) {
      console.error("Failed to get all user IDs:", error);
      return [];
    }
  },

  /**
   * Delete specific user data (for account deletion)
   */
  deleteUserData(userId) {
    try {
      if (!userId) return false;

      localStorage.removeItem(userId.toString());

      console.log(`✅ User ${userId} data deleted`);
      return true;
    } catch (error) {
      console.error("Failed to delete user data:", error);
      return false;
    }
  },

  /**
   * Clear all storage (use with caution)
   */
  clearAllStorage() {
    try {
      localStorage.clear();
      console.log("✅ All storage cleared");
      return true;
    } catch (error) {
      console.error("Failed to clear storage:", error);
      return false;
    }
  },

  /**
   * Migrate old localStorage format to new format
   * Call this once to migrate existing users
   */
  migrateOldStorage() {
    try {
      console.log("🔄 Starting storage migration...");

      // Check if old format exists
      const oldUserId = localStorage.getItem("userId");
      const oldUser = localStorage.getItem("user");
      const oldAccessToken =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken");
      const oldUsername = localStorage.getItem("username");
      const oldFirstName = localStorage.getItem("firstName");
      const oldLastName = localStorage.getItem("lastName");
      const oldIsLoggedIn = localStorage.getItem("isLoggedIn");

      if (!oldUserId) {
        console.log("ℹ️ No old data to migrate");
        return false;
      }

      // Parse old user object if exists
      let oldUserData = {};
      if (oldUser) {
        try {
          oldUserData = JSON.parse(oldUser);
        } catch (e) {
          console.warn("Failed to parse old user data");
        }
      }

      // Create new user data object
      const newUserData = {
        userId: parseInt(oldUserId),
        username: oldUsername || oldUserData.username || "",
        firstName: oldFirstName || oldUserData.firstName || "",
        lastName: oldLastName || oldUserData.lastName || "",
        profileURL: oldUserData.profileURL || "",
        status: oldUserData.status || "ACTIVE",
        accessToken: oldAccessToken || oldUserData.token || "",
        userPrivateKey: localStorage.getItem("userPrivateKey") || "",
        decryptedBackendData:
          localStorage.getItem("decryptedBackendData") || "",
        encryptedPrivateKey: localStorage.getItem("encryptedPrivateKey") || "",
        fcmToken: localStorage.getItem("fcmToken") || "",
        fcmTokenSent: localStorage.getItem("fcmTokenSent") === "true",
        lastFcmToken: localStorage.getItem("lastFcmToken") || "",
        isLoggedIn: oldIsLoggedIn === "true",
        permissionsGranted:
          localStorage.getItem("permissionsGranted") === "true",
        ...oldUserData,
      };

      // Store in new format (isLoggedIn flag is already in newUserData)
      this.setUserData(oldUserId, newUserData);

      // Clean up old keys
      const oldKeys = [
        "userId",
        "user",
        "accessToken",
        "authToken",
        "username",
        "firstName",
        "lastName",
        "isLoggedIn",
        "userPrivateKey",
        "decryptedBackendData",
        "encryptedPrivateKey",
        "fcmToken",
        "fcmTokenSent",
        "lastFcmToken",
        "permissionsGranted",
        "refreshToken",
        "currentUserId", // Remove this too if it exists from old migration
      ];

      oldKeys.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn(`Failed to remove old key: ${key}`);
        }
      });

      console.log("✅ Storage migration completed");
      return true;
    } catch (error) {
      console.error("Failed to migrate storage:", error);
      return false;
    }
  },
};

export default StorageService;
