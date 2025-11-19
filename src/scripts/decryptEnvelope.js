// ============================================
// HELPER FUNCTIONS
// ============================================

// Normalize base64 (fix URL-safe and add padding)
function normalizeBase64(b64) {
  let s = b64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/\r?\n|\r/g, "");
  while (s.length % 4 !== 0) s += "=";
  return s;
}

// Convert Base64 → Uint8Array
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Uint8Array → Base64
function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Remove PEM header/footer and whitespace
function stripPem(key) {
  return key
    .replace(/-----BEGIN [\w\s]+-----/g, "")
    .replace(/-----END [\w\s]+-----/g, "")
    .replace(/\s+/g, "");
}

// ============================================
// RSA ENVELOPE - DECRYPT
// ============================================

export async function decryptEnvelope(envelope, recipientPrivateKey) {
  console.log("Decrypting envelope");

  try {
    // Clean & normalize the private key base64
    const maybePem = stripPem(recipientPrivateKey);
    const normalizedKeyB64 = normalizeBase64(maybePem);

    // Convert to bytes
    const pkcs8Bytes = base64ToBytes(normalizedKeyB64);
    console.log("Private key bytes length:", pkcs8Bytes.length);

    // Import PKCS#8 private key
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      pkcs8Bytes.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"]
    );
    console.log("Imported privateKey:", privateKey);

    // Normalize envelope base64
    const normalizedEnvelopeB64 = normalizeBase64(envelope);
    const envelopeBytes = base64ToBytes(normalizedEnvelopeB64);
    console.log("Envelope bytes length:", envelopeBytes.length);

    // Decrypt the envelope
    const decryptedArrayBuffer = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      envelopeBytes.buffer
    );

    // Return as Base64 (matching Java's return format)
    const resultB64 = bytesToBase64(new Uint8Array(decryptedArrayBuffer));
    console.log("Envelope decrypted (base64):", resultB64);
    return resultB64;
  } catch (err) {
    console.error("Failed to decrypt envelope", err);
    throw new Error("Envelope decryption failed: " + err.message);
  }
}

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export default {
  decryptEnvelope,
};
