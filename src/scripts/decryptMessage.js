import CryptoJS from "crypto-js";

export function decryptMessage(ciphertext, messageKey) {
  try {
    console.log("Decrypting message with key:", messageKey);

    // Decode Base64 key
    const key = CryptoJS.enc.Base64.parse(messageKey);

    // Decode Base64 ciphertext
    const encryptedData = CryptoJS.enc.Base64.parse(ciphertext);

    // Perform AES decrypt in ECB mode
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: encryptedData }, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    });

    return CryptoJS.enc.Utf8.stringify(decrypted);
  } catch (error) {
    console.error("Failed to decrypt message", error);
    return null;
  }
}

export default decryptMessage;

// Example usage
// const plaintext = decryptMessage(ciphertext, messageKey);
// console.log(plaintext);
