import CryptoJS from "crypto-js";

/**
 * EncryptionService - Handles AES encryption/decryption for private keys
 * Converted from Java AES implementation to JavaScript
 */
class EncryptionService {
  // These should match your Java backend constants
  static SECRET_KEY = "12345678901234567890123456789012";
  static INIT_VECTOR = "1234567890123456";

  /**
   * Encrypt data using AES
   * Equivalent to Java's encrypt method
   * @param {string} data - Plain text data to encrypt
   * @returns {string} - Base64 URL-safe encoded encrypted data
   */
  static encrypt(data) {
    try {
      // Convert secret key and IV to WordArray
      const key = CryptoJS.enc.Utf8.parse(this.SECRET_KEY);
      const iv = CryptoJS.enc.Utf8.parse(this.INIT_VECTOR);

      // Encrypt using AES CBC mode with PKCS7 padding (equivalent to PKCS5)
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Convert to Base64 and make it URL-safe (without padding)
      let base64 = encrypted.toString();
      let urlSafeBase64 = base64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      return urlSafeBase64;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Error while encoding the input: " + error.message);
    }
  }

  /**
   * Decrypt data using AES
   * Equivalent to Java's decrypt method
   * @param {string} encryptedData - Base64 URL-safe encoded encrypted data
   * @returns {string} - Decrypted plain text
   */
  static decrypt(encryptedData) {
    try {
      // Convert URL-safe Base64 back to regular Base64
      let base64 = encryptedData.replace(/-/g, "+").replace(/_/g, "/");

      // Add padding if needed
      while (base64.length % 4) {
        base64 += "=";
      }

      // Convert secret key and IV to WordArray
      const key = CryptoJS.enc.Utf8.parse(this.SECRET_KEY);
      const iv = CryptoJS.enc.Utf8.parse(this.INIT_VECTOR);

      // Decrypt using AES CBC mode
      const decrypted = CryptoJS.AES.decrypt(base64, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      // Convert to UTF-8 string
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

      if (!decryptedText) {
        throw new Error(
          "Decryption resulted in empty text - invalid key or corrupted data"
        );
      }
      return decryptedText;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Error while decoding the input: " + error.message);
    }
  }

  /**
   * Test the encryption/decryption flow
   * @param {string} testData - Data to test with
   * @returns {Object} - Test results
   */
  static testEncryption(testData = "Hello, this is a test!") {
    try {
      const encrypted = this.encrypt(testData);
      const decrypted = this.decrypt(encrypted);
      const isMatch = testData === decrypted;
      return {
        success: true,
        original: testData,
        encrypted: encrypted,
        decrypted: decrypted,
        isMatch: isMatch,
      };
    } catch (error) {
      console.error("Encryption test failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default EncryptionService;
