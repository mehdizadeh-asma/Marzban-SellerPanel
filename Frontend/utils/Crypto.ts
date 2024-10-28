import crypto from "crypto";

// Base64 encoded key and IV
const keyString = "Fair@Internet@Seller@Marzban@Panel@1401@1402@1403@1";
const ivString = "Seller@Marzban@Panel@1401";

// Convert to buffers
const key = Buffer.from(keyString, "base64");
const iv = Buffer.from(ivString, "base64");

console.log(key.length, iv.length);

// Ensure the key and IV are of the correct length
if (key.length !== 32) {
  throw new Error("Key must be 32 bytes long");
}
if (iv.length !== 16) {
  throw new Error("IV must be 16 bytes long");
}

// Function to encrypt data
export function encrypt(text: string) {
  let cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

// Function to decrypt data
export function decrypt(encryptedText: string) {
  let decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
