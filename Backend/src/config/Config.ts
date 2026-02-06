import { promises as fs } from "fs";
import path from "path";

interface ConfigFileShape {
  BACKEND_URL?: string;
  IGNORE_TRAFFIC_TO_REMOVE?: string;
  RENEW_FORCE_TO_PAID?: string;
  RENEW_FORCE_TO_LIMITED_AND_EXPIRED?: string;
}

class ConfigFile {
  private static config: ConfigFileShape | undefined = undefined;

  private static async loadFileConfig(): Promise<void> {
    if (this.config !== undefined) return;
    const filepath = path.join(process.cwd(), "data", "config.json");
    try {
      const fileContents = await fs.readFile(filepath, "utf8");
      this.config = fileContents ? (JSON.parse(fileContents) as ConfigFileShape) : {};
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        this.config = {};
        return;
      }
      throw error;
    }
  }

  private static async getConfig(): Promise<ConfigFileShape> {
    if (this.config === undefined) {
      await this.loadFileConfig();
    }
    return this.config ?? {};
  }

  private static getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`${key} is not configured`);
    }
    return value;
  }

  private static getEnv(key: string, fallback?: string): string {
    const value = process.env[key];
    if (value === undefined || value === "") {
      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error(`${key} is not configured`);
    }
    return value;
  }

  private static getOptionalEnv(key: string): string | undefined {
    const value = process.env[key];
    if (value === undefined || value === "") {
      return undefined;
    }
    return value;
  }

  private static normalizeOrigin(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed === "*") return "*";
    try {
      return new URL(trimmed).origin;
    } catch {
      return undefined;
    }
  }

  static async GetMarzbanURL(): Promise<string> {
    return this.getRequiredEnv("MARZBAN_URL");
  }

  static async GetSubscriptionURL(): Promise<string> {
    return this.getRequiredEnv("SUBSCRIPTION_URL");
  }

  static async GetMarzbanUsername(): Promise<string> {
    return this.getRequiredEnv("SUDO_MARZBAN_USERNAME");
  }

  static async GetMarzbanPassword(): Promise<string> {
    return this.getRequiredEnv("SUDO_MARZBAN_PASSWORD");
  }

  static async GetRenewForceToPaid(): Promise<string> {
    const config = await this.getConfig();
    if (config.RENEW_FORCE_TO_PAID) return config.RENEW_FORCE_TO_PAID;
    throw new Error("RENEW_FORCE_TO_PAID doesn't exist in config File!");
  }

  static async GetRenewForceToLimitedAndExpired(): Promise<string> {
    const config = await this.getConfig();
    if (config.RENEW_FORCE_TO_LIMITED_AND_EXPIRED) return config.RENEW_FORCE_TO_LIMITED_AND_EXPIRED;
    throw new Error("RENEW_FORCE_TO_LIMITED_AND_EXPIRED doesn't exist in config File!");
  }

  static async GetAllUsersForAgent(): Promise<string> {
    return this.getEnv("GET_ALL_USERS_FOR_AGENT", "No");
  }

  static async GetDeletePaidAndRemovedUsers(): Promise<string> {
    return this.getEnv("DELETE_PAIDANDREMOVED_USERS", "No");
  }

  static async GetMarzbanFlow(): Promise<string> {
    return this.getEnv("MARZBAN_FLOW", "none");
  }

  static async GetSellerAdminUsername(): Promise<string> {
    return this.getRequiredEnv("SELLER_ADMIN_USERNAME");
  }

  static async GetSellerAdminPassword(): Promise<string> {
    return this.getRequiredEnv("SELLER_ADMIN_PASSWORD");
  }

  static async GetIgnoreTrafficToRemove(): Promise<number> {
    const config = await this.getConfig();
    if (config.IGNORE_TRAFFIC_TO_REMOVE) {
      return +config.IGNORE_TRAFFIC_TO_REMOVE;
    }
    throw new Error("IGNORE_TRAFFIC_TO_REMOVE doesn't exist in config File!");
  }

  static async GetSerialKey(): Promise<string> {
    return this.getRequiredEnv("SERIALKEY");
  }

  static async GetPanelDbCluster(): Promise<string> {
    return this.getRequiredEnv("PANEL_DB_CLUSTER");
  }

  static async GetPanelDbDatabase(): Promise<string> {
    return this.getRequiredEnv("PANEL_DB_DATABASE");
  }

  static async GetPanelDbUsername(): Promise<string> {
    return this.getRequiredEnv("PANEL_DB_USERNAME");
  }

  static async GetPanelDbPassword(): Promise<string> {
    return this.getRequiredEnv("PANEL_DB_PASSWORD");
  }

  static async GetJwtSecret(): Promise<string> {
    return this.getRequiredEnv("JWT_SECRET");
  }

  static async GetJwtIssuer(): Promise<string | undefined> {
    return this.getOptionalEnv("JWT_ISSUER");
  }

  static async GetJwtAudience(): Promise<string | undefined> {
    return this.getOptionalEnv("JWT_AUDIENCE");
  }

  static async GetSellerPasswordKey(): Promise<string> {
    return this.getRequiredEnv("SELLER_PASSWORD_KEY");
  }

  static async GetSessionTtlMinutes(): Promise<number> {
    const ttl = this.getEnv("SESSION_TTL_MINUTES", "30");
    const ttlNumber = Number(ttl);
    return Number.isFinite(ttlNumber) && ttlNumber > 0 ? ttlNumber : 30;
  }

  static async GetJwtExpiresIn(): Promise<string> {
    return this.getEnv("JWT_EXPIRES_IN", "30m");
  }

  static async GetJwtAlgorithms(): Promise<string[]> {
    const raw = this.getOptionalEnv("JWT_ALGORITHMS");
    if (!raw) return ["HS256"];
    const parsed = raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    return parsed.length > 0 ? parsed : ["HS256"];
  }

  static async GetAllowedOrigins(): Promise<string[]> {
    const allowAllCors = this.getEnv("CORS_ALLOW_ALL", "No").toLowerCase() === "yes";
    if (allowAllCors) {
      return ["*"];
    }

    const rawAllowed = this.getOptionalEnv("ALLOWED_ORIGINS");
    const backendUrl = this.getOptionalEnv("BACKEND_URL");
    const backendOrigin = backendUrl ? this.normalizeOrigin(backendUrl) : undefined;

    if (rawAllowed) {
      const set = new Set<string>();
      for (const entry of rawAllowed.split(",").map((origin) => origin.trim())) {
        if (!entry) continue;
        const normalized = this.normalizeOrigin(entry);
        if (normalized) {
          set.add(normalized);
        }
      }
      if (backendOrigin) {
        set.add(backendOrigin);
      }
      const list = Array.from(set);
      return list.includes("*") ? ["*"] : list;
    }

    if (backendOrigin) {
      return [backendOrigin];
    }

    return ["*"];
  }

  static async ShouldForceHttps(): Promise<boolean> {
    return this.getEnv("FORCE_HTTPS", "No").toLowerCase() === "yes";
  }

  static async GetLoginRateLimitMax(): Promise<number> {
    const raw = this.getEnv("LOGIN_RATE_LIMIT_MAX", "5");
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
  }

  static async GetLoginRateLimitWindowMs(): Promise<number> {
    const raw = this.getEnv("LOGIN_RATE_LIMIT_WINDOW_MS", "60000");
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60000;
  }
}
export default ConfigFile;
