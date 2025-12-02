/**
 * Mobile-friendly file picker utility
 * Handles file selection on both web and native mobile
 */

import { Capacitor } from "@capacitor/core";

/**
 * Trigger file input click with mobile-friendly approach
 * @param {React.RefObject} inputRef - Reference to the file input element
 * @param {string} type - Type of file picker ('photo', 'file', 'image')
 */
export const triggerFilePicker = (inputRef, type = "file") => {
  console.log(`📁 Triggering ${type} picker...`);

  if (!inputRef || !inputRef.current) {
    console.error("❌ File input ref is null");
    return false;
  }

  try {
    const input = inputRef.current;

    // Reset the input value to allow selecting the same file again
    input.value = "";

    // For mobile devices, we need to ensure the input is properly triggered
    if (Capacitor.isNativePlatform()) {
      console.log("📱 Native platform detected");

      // Create a temporary click event
      const clickEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
      });

      // Dispatch the event
      input.dispatchEvent(clickEvent);

      // Also try direct click as fallback
      setTimeout(() => {
        input.click();
      }, 100);
    } else {
      // Web platform - simple click
      console.log("🌐 Web platform detected");
      input.click();
    }

    return true;
  } catch (error) {
    console.error("❌ Error triggering file picker:", error);
    return false;
  }
};

/**
 * Configure file input for mobile compatibility
 * @param {HTMLInputElement} input - The file input element
 * @param {Object} options - Configuration options
 */
export const configureFileInput = (input, options = {}) => {
  if (!input) return;

  const { accept = "*/*", multiple = false, capture = null } = options;

  // Set attributes
  input.setAttribute("accept", accept);
  input.setAttribute("multiple", multiple ? "multiple" : "");

  if (capture && Capacitor.isNativePlatform()) {
    input.setAttribute("capture", capture);
  }

  // Ensure input is properly hidden but accessible
  input.style.position = "absolute";
  input.style.left = "-9999px";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.opacity = "0";

  console.log("✅ File input configured:", {
    accept,
    multiple,
    capture,
    isNative: Capacitor.isNativePlatform(),
  });
};

/**
 * Validate selected files
 * @param {FileList} files - Selected files
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
export const validateFiles = (files, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = [],
    maxFiles = 10,
  } = options;

  if (!files || files.length === 0) {
    return { valid: false, error: "No files selected" };
  }

  if (files.length > maxFiles) {
    return { valid: false, error: `Maximum ${maxFiles} files allowed` };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File "${file.name}" is too large. Maximum size is ${Math.round(
          maxSize / 1024 / 1024
        )}MB`,
      };
    }

    // Check file type if specified
    if (allowedTypes.length > 0) {
      const fileType = file.type;
      const isAllowed = allowedTypes.some((type) => {
        if (type.endsWith("/*")) {
          const category = type.split("/")[0];
          return fileType.startsWith(category + "/");
        }
        return fileType === type;
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `File type "${fileType}" is not allowed`,
        };
      }
    }
  }

  return { valid: true };
};

export default {
  triggerFilePicker,
  configureFileInput,
  validateFiles,
};
