/**
 * Safe localStorage wrapper to prevent crashes
 * Handles quota exceeded, disabled storage, and other errors
 */

export const safeStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(
        `Failed to get item "${key}" from localStorage:`,
        error.message
      );
      return null;
    }
  },

  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(
        `Failed to set item "${key}" in localStorage:`,
        error.message
      );
      return false;
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(
        `Failed to remove item "${key}" from localStorage:`,
        error.message
      );
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn("Failed to clear localStorage:", error.message);
      return false;
    }
  },

  // Safe JSON parse
  getJSON: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to parse JSON for "${key}":`, error.message);
      return defaultValue;
    }
  },

  // Safe JSON stringify and set
  setJSON: (key, value) => {
    try {
      const jsonString = JSON.stringify(value);
      localStorage.setItem(key, jsonString);
      return true;
    } catch (error) {
      console.warn(`Failed to stringify and set "${key}":`, error.message);
      return false;
    }
  },
};

export default safeStorage;
