import crypto from "crypto";

const keyString = "Fair@Internet@Seller@Marzban@Panel@1401@1402@1403@1";
const ivString = "Seller@Marzban@Panel@1401";

const key = Buffer.from(keyString, "base64");
const iv = Buffer.from(ivString, "base64");

if (key.length !== 32) {
  throw new Error("Key must be 32 bytes long");
}
if (iv.length !== 16) {
  throw new Error("IV must be 16 bytes long");
}

export function encrypt(text: string) {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function decrypt(encryptedText: string) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
