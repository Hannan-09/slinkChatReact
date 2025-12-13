import CryptoJS from "crypto-js";
import StorageService from "./StorageService";

// Helper: convert Base64 → Uint8Array
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Helper: Uint8Array → Base64
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Step 1: Decrypt envelope to get message key
async function decryptEnvelope(envelope, recipientPrivateKey) {
  try {
    console.log("🔐 Decrypting envelope...");

    // 1. Decode Base64 private key
    const privateKeyBytes = base64ToBytes(recipientPrivateKey);

    // 2. Import private key into WebCrypto
    const privateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      privateKeyBytes,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );

    // 3. Decode Base64 envelope
    const envelopeBytes = base64ToBytes(envelope);

    // 4. Decrypt with RSA-OAEP-SHA256
    const decryptedBytes = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      envelopeBytes
    );

    // 5. Convert result to Base64 (message key)
    const messageKey = bytesToBase64(new Uint8Array(decryptedBytes));
    console.log("✅ Envelope decrypted, message key obtained");
    return messageKey;
  } catch (err) {
    console.error("❌ Failed to decrypt envelope:", err);
    throw new Error("Envelope decryption failed");
  }
}

// Step 2: Decrypt message content using message key
function decryptMessageContent(ciphertext, messageKey) {
  try {
    console.log("🔐 Decrypting message content...");

    // Decode Base64 key
    const key = CryptoJS.enc.Base64.parse(messageKey);

    // Decode Base64 ciphertext
    const encryptedData = CryptoJS.enc.Base64.parse(ciphertext);

    // Perform AES decrypt in ECB mode
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: encryptedData }, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = CryptoJS.enc.Utf8.stringify(decrypted);
    console.log("✅ Message content decrypted");
    return plaintext;
  } catch (error) {
    console.error("❌ Failed to decrypt message content:", error);
    return null;
  }
}

// Main function: Decrypt a complete message
export async function decryptMessage(
  encryptedContent,
  encryptedEnvelope,
  privateKeyBase64
) {
  try {
    // Check if message has encryption data
    if (!encryptedEnvelope || !encryptedContent) {
      console.log("⚠️ Message not encrypted or missing encryption data");
      return encryptedContent; // Return as-is if not encrypted
    }

    console.log("🔐 Starting message decryption...");

    // Step 1: Decrypt envelope to get message key
    const messageKey = await decryptEnvelope(
      encryptedEnvelope,
      privateKeyBase64
    );
    console.log(
      "📝 Decrypted message key (first 20 chars):",
      messageKey.substring(0, 20) + "..."
    );

    // Step 2: Decrypt message content using message key
    const plaintext = decryptMessageContent(encryptedContent, messageKey);

    if (!plaintext) {
      console.error("❌ Decryption failed, returning encrypted content");
      return encryptedContent;
    }

    console.log("✅ Message fully decrypted:", plaintext);
    return plaintext;
  } catch (error) {
    console.error("❌ Message decryption error:", error);
    return encryptedContent; // Return encrypted content if decryption fails
  }
}

// Helper: Get private key from localStorage
export function getPrivateKey() {
  try {
    // Try to get the decrypted backend data first
    const privateKey = StorageService.getUserField("decryptedBackendData");
    if (privateKey) {
      console.log("✅ Private key found in storage", privateKey);
      return privateKey;
    }

    console.warn("⚠️ Private key not found in localStorage");
    return null;
  } catch (error) {
    console.error("❌ Error getting private key:", error);
    return null;
  }
}

export default {
  decryptMessage,
  getPrivateKey,
};
