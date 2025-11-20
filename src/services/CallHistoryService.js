import apiClient from "./AuthService";

// Call History API endpoints
export const CallHistoryAPI = {
  // Get all call history by user
  getAllCallHistory: async (
    userId,
    pageNumber = 1,
    size = 10,
    sortBy = "createdAt",
    callType = null,
    sortDirection = "desc"
  ) => {
    try {
      let endpoint = `/call/history/user/${userId}?pageNumber=${pageNumber}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`;

      if (callType) {
        endpoint += `&callType=${callType}`;
      }

      const response = await apiClient.get(endpoint);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Get call history error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get call history",
      };
    }
  },

  // Get single call history by id
  getCallHistoryById: async (callHistoryId, userId) => {
    try {
      const response = await apiClient.get(
        `/call/history/${callHistoryId}/user/${userId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Get call history by id error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to get call history",
      };
    }
  },

  // Delete call history by user
  deleteCallHistory: async (callHistoryId, userId) => {
    try {
      const response = await apiClient.delete(
        `/call/history/${callHistoryId}/user/${userId}`
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Delete call history error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Failed to delete call history",
      };
    }
  },
};

export default CallHistoryAPI;
