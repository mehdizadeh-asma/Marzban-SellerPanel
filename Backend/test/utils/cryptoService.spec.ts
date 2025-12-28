jest.mock("../../src/config/Config", () => ({
  __esModule: true,
  default: {
    GetSellerPasswordKey: jest.fn().mockResolvedValue("unit-test-key"),
    GetJwtSecret: jest.fn().mockResolvedValue("unit-test-secret"),
  },
}));

type CryptoServiceContract = typeof CryptoModule.CryptoService;

describe("CryptoService", () => {
  let CryptoService: CryptoServiceContract;

  beforeEach(() => {
    jest.resetModules();
    CryptoService = require("../../src/services/security/CryptoService")
      .CryptoService as CryptoServiceContract;
  });

  it("should encrypt and decrypt the same value", async () => {
    const value = "secret-value";
    const encrypted = await CryptoService.encrypt(value);
    expect(encrypted).toMatch(/^enc:/);
    const decrypted = await CryptoService.decrypt(encrypted);
    expect(decrypted).toBe(value);
  });

  it("should skip encryption for empty values", async () => {
    await expect(CryptoService.encrypt("")).resolves.toBe("");
    await expect(CryptoService.decrypt("")).resolves.toBe("");
  });

  it("should ignore decrypting plain values", async () => {
    await expect(CryptoService.decrypt("plain")).resolves.toBe("plain");
  });

  it("should skip encryption for already encrypted values", async () => {
    const value = "enc:already";
    await expect(CryptoService.encrypt(value)).resolves.toBe(value);
  });

  it("returns original when encrypted payload is malformed", async () => {
    const malformed = "enc:missing-parts";
    await expect(CryptoService.decrypt(malformed)).resolves.toBe(malformed);
  });

  it("uses seller password key when available", async () => {
    const ConfigFile = require("../../src/config/Config").default;
    const value = "secret-key";
    const encrypted = await CryptoService.encrypt(value);
    const decrypted = await CryptoService.decrypt(encrypted);
    expect(ConfigFile.GetSellerPasswordKey).toHaveBeenCalled();
    expect(decrypted).toBe(value);
  });

  it("falls back to jwt secret when seller key is missing", async () => {
    jest.resetModules();
    const ConfigFile = require("../../src/config/Config").default;
    ConfigFile.GetSellerPasswordKey = jest.fn().mockRejectedValue(new Error("missing"));
    ConfigFile.GetJwtSecret = jest.fn().mockResolvedValue("jwt-key");
    const { CryptoService: FreshCrypto } = require("../../src/services/security/CryptoService") as {
      CryptoService: CryptoServiceContract;
    };
    const value = "secret-value";
    const encrypted = await FreshCrypto.encrypt(value);
    const decrypted = await FreshCrypto.decrypt(encrypted);
    expect(ConfigFile.GetJwtSecret).toHaveBeenCalled();
    expect(decrypted).toBe(value);
  });

  it("decrypts legacy payloads using jwt fallback key", async () => {
    jest.resetModules();
    const LegacyConfig = require("../../src/config/Config").default;
    LegacyConfig.GetSellerPasswordKey = jest.fn().mockRejectedValue(new Error("missing"));
    LegacyConfig.GetJwtSecret = jest.fn().mockResolvedValue("legacy-key");
    const { CryptoService: LegacyCrypto } =
      require("../../src/services/security/CryptoService") as {
        CryptoService: CryptoServiceContract;
      };
    const encrypted = await LegacyCrypto.encrypt("legacy-value");

    jest.resetModules();
    const NewConfig = require("../../src/config/Config").default;
    NewConfig.GetSellerPasswordKey = jest.fn().mockResolvedValue("new-key");
    NewConfig.GetJwtSecret = jest.fn().mockResolvedValue("legacy-key");
    const { CryptoService: NewCrypto } = require("../../src/services/security/CryptoService") as {
      CryptoService: CryptoServiceContract;
    };
    const decrypted = await NewCrypto.decrypt(encrypted);
    expect(decrypted).toBe("legacy-value");
  });

  it("continues when jwt fallback lookup fails", async () => {
    jest.resetModules();
    const ConfigFile = require("../../src/config/Config").default;
    ConfigFile.GetSellerPasswordKey = jest.fn().mockResolvedValue("seller-key");
    ConfigFile.GetJwtSecret = jest.fn().mockRejectedValue(new Error("boom"));
    const { CryptoService: FreshCrypto } = require("../../src/services/security/CryptoService") as {
      CryptoService: CryptoServiceContract;
    };
    const encrypted = await FreshCrypto.encrypt("value");
    const decrypted = await FreshCrypto.decrypt(encrypted);
    expect(decrypted).toBe("value");
  });

  it("throws when decrypting with the wrong key and no fallback", async () => {
    jest.resetModules();
    const EncryptConfig = require("../../src/config/Config").default;
    EncryptConfig.GetSellerPasswordKey = jest.fn().mockResolvedValue("seller-key");
    EncryptConfig.GetJwtSecret = jest.fn().mockResolvedValue("jwt-key");
    const { CryptoService: EncryptCrypto } =
      require("../../src/services/security/CryptoService") as {
        CryptoService: CryptoServiceContract;
      };
    const encrypted = await EncryptCrypto.encrypt("value");

    jest.resetModules();
    const DecryptConfig = require("../../src/config/Config").default;
    DecryptConfig.GetSellerPasswordKey = jest.fn().mockRejectedValue(new Error("missing"));
    DecryptConfig.GetJwtSecret = jest.fn().mockResolvedValue("different-key");
    const { CryptoService: DecryptCrypto } =
      require("../../src/services/security/CryptoService") as {
        CryptoService: CryptoServiceContract;
      };

    await expect(DecryptCrypto.decrypt(encrypted)).rejects.toThrow();
  });

  it("throws when no encryption key is configured", async () => {
    jest.resetModules();
    const ConfigFile = require("../../src/config/Config").default;
    ConfigFile.GetSellerPasswordKey = jest.fn().mockRejectedValue(new Error("missing"));
    ConfigFile.GetJwtSecret = jest.fn().mockResolvedValue("");
    const { CryptoService: FreshCrypto } = require("../../src/services/security/CryptoService") as {
      CryptoService: CryptoServiceContract;
    };
    await expect(FreshCrypto.encrypt("value")).rejects.toThrow("Encryption key is not configured");
  });
});
import type * as CryptoModule from "../../src/services/security/CryptoService";
