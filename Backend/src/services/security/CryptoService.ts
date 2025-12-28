import crypto from "crypto";

import ConfigFile from "../../config/Config";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:";

export class CryptoService {
  private static keyPromise: Promise<{ primary: Buffer; fallback?: Buffer }> | null = null;

  private static async getKeys(): Promise<{ primary: Buffer; fallback?: Buffer }> {
    if (this.keyPromise) return this.keyPromise;
    this.keyPromise = (async () => {
      let primarySecret: string | undefined;
      let fallbackSecret: string | undefined;

      try {
        primarySecret = await ConfigFile.GetSellerPasswordKey();
      } catch {
        primarySecret = undefined;
      }

      if (!primarySecret) {
        primarySecret = await ConfigFile.GetJwtSecret();
      } else {
        try {
          fallbackSecret = await ConfigFile.GetJwtSecret();
        } catch {
          fallbackSecret = undefined;
        }
      }

      if (!primarySecret) {
        throw new Error("Encryption key is not configured");
      }

      const primary = crypto.createHash("sha256").update(primarySecret).digest();
      const fallback =
        fallbackSecret && fallbackSecret !== primarySecret
          ? crypto.createHash("sha256").update(fallbackSecret).digest()
          : undefined;

      return { primary, fallback };
    })();
    return this.keyPromise;
  }

  private static decryptWithKey(iv: Buffer, tag: Buffer, data: Buffer, key: Buffer): string {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  }

  static async encrypt(plain: string): Promise<string> {
    if (!plain) return plain;
    if (plain.startsWith(PREFIX)) return plain;
    const { primary } = await this.getKeys();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, primary, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
  }

  static async decrypt(value: string): Promise<string> {
    if (!value) return value;
    if (!value.startsWith(PREFIX)) return value;
    const [, ivB64, tagB64, dataB64] = value.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return value;
    const { primary, fallback } = await this.getKeys();
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    try {
      return this.decryptWithKey(iv, tag, data, primary);
    } catch (error) {
      if (fallback) {
        return this.decryptWithKey(iv, tag, data, fallback);
      }
      throw error;
    }
  }
}
