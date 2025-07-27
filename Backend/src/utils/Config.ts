import path from "path";
import { promises as fs } from "fs";

interface ConfigType {
  MARZBAN_URL: string;
  SUBSCRIPTION_URL: string;
  SUDO_MARZBAN_USERNAME: string;
  SUDO_MARZBAN_PASSWORD: string;
  MARZBAN_FLOW: string;
  SELLER_ADMIN_USERNAME: string;
  SELLER_ADMIN_PASSWORD: string;
  IGNORE_TRAFFIC_TO_REMOVE: string;
  GET_ALL_USERS_FOR_AGENT: string;
  RENEW_FORCE_TO_PAID: string;
  RENEW_FORCE_TO_LIMITED_AND_EXPIRED: string;
  SERIALKEY: string;
}

class ConfigFile {
  private static config: ConfigType | undefined = undefined;

  static async GetConfigFromFile() {
    const filepath = path.join(process.cwd(), "data", "config.json");
    const fileContents = await fs.readFile(filepath, "utf8");
    if (fileContents) {
      this.config = JSON.parse(fileContents) as ConfigType;
    }
  }

  static async GetMarzbanURL() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.MARZBAN_URL) return this.config.MARZBAN_URL;

    throw new Error("MARZBAN_URL doesn't exist in config File!");
  }

  static async GetSubscriptionURL() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.SUBSCRIPTION_URL)
      return this.config.SUBSCRIPTION_URL;

    throw new Error("SUBSCRIPTION_URL doesn't exist in config File!");
  }

  static async GetMarzbanUsername() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.SUDO_MARZBAN_USERNAME)
      return this.config.SUDO_MARZBAN_USERNAME;

    throw new Error("NOSUDO_MARZBAN_USERNAME doesn't exist in config File!");
  }

  static async GetMarzbanPassword() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.SUDO_MARZBAN_PASSWORD)
      return this.config.SUDO_MARZBAN_PASSWORD;

    throw new Error("NOSUDO_MARZBAN_PASSWORD doesn't exist in config File!");
  }

  static async GetRenewForceToPaid() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.RENEW_FORCE_TO_PAID)
      return this.config.RENEW_FORCE_TO_PAID;

    throw new Error("RENEW_FORCE_TO_PAID doesn't exist in config File!");
  }

  static async GetRenewForceToLimitedAndExpired() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.RENEW_FORCE_TO_LIMITED_AND_EXPIRED)
      return this.config.RENEW_FORCE_TO_LIMITED_AND_EXPIRED;

    throw new Error("RENEW_FORCE_TO_LIMITED_AND_EXPIRED doesn't exist in config File!");
  }

  static async GetAllUsersForAgent() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.GET_ALL_USERS_FOR_AGENT)
      return this.config.GET_ALL_USERS_FOR_AGENT;

    throw new Error("GET_ALL_USERS_FOR_AGENT doesn't exist in config File!");
  }  

  static async GetMarzbanFlow() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.MARZBAN_FLOW)
      return this.config.MARZBAN_FLOW;

    throw new Error("MARZBAN_FLOW doesn't exist in config File!");
  }

  static async GetSellerAdminUsername() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.SELLER_ADMIN_USERNAME)
      return this.config.SELLER_ADMIN_USERNAME;

    throw new Error("SELLER_ADMIN_USERNAME doesn't exist in config File!");
  }

  static async GetSellerAdminPassword() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.SELLER_ADMIN_PASSWORD)
      return this.config.SELLER_ADMIN_PASSWORD;

    throw new Error("SELLER_ADMIN_PASSWORD doesn't exist in config File!");
  }

  static async GetIgnoreTrafficToRemove() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.IGNORE_TRAFFIC_TO_REMOVE)
      return +this.config.IGNORE_TRAFFIC_TO_REMOVE;

    throw new Error("IGNORE_TRAFFIC_TO_REMOVE doesn't exist in config File!");
  }

  static async GetSerialKey() {
    if (!this.config) await this.GetConfigFromFile();

    if (this.config && this.config.SERIALKEY) return this.config.SERIALKEY;

    throw new Error("SERIALKEY doesn't exist in config File!");
  }
}
export default ConfigFile;
