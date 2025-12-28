jest.mock("fs", () => ({ promises: { readFile: jest.fn() } }));

describe("Config utils", () => {
  let ConfigFile: ReturnType<typeof require>;
  let fsMock: ReturnType<typeof require>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv } as NodeJS.ProcessEnv;
    ConfigFile = require("../../src/config/Config").default;
    fsMock = require("fs");
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should read sensitive settings from environment variables", async () => {
    process.env.MARZBAN_URL = "http://m";
    process.env.SUBSCRIPTION_URL = "s";
    process.env.SUDO_MARZBAN_USERNAME = "u";
    process.env.SUDO_MARZBAN_PASSWORD = "p";
    process.env.SELLER_ADMIN_USERNAME = "a";
    process.env.SELLER_ADMIN_PASSWORD = "b";
    process.env.SERIALKEY = "serial";
    process.env.PANEL_DB_CLUSTER = "cluster";
    process.env.PANEL_DB_DATABASE = "db";
    process.env.PANEL_DB_USERNAME = "user";
    process.env.PANEL_DB_PASSWORD = "pass";
    process.env.JWT_SECRET = "secret";
    process.env.SELLER_PASSWORD_KEY = "enc";

    await expect(ConfigFile.GetMarzbanURL()).resolves.toBe("http://m");
    await expect(ConfigFile.GetSubscriptionURL()).resolves.toBe("s");
    await expect(ConfigFile.GetMarzbanUsername()).resolves.toBe("u");
    await expect(ConfigFile.GetMarzbanPassword()).resolves.toBe("p");
    await expect(ConfigFile.GetSellerAdminUsername()).resolves.toBe("a");
    await expect(ConfigFile.GetSellerAdminPassword()).resolves.toBe("b");
    await expect(ConfigFile.GetSerialKey()).resolves.toBe("serial");
    await expect(ConfigFile.GetPanelDbCluster()).resolves.toBe("cluster");
    await expect(ConfigFile.GetSellerPasswordKey()).resolves.toBe("enc");
    process.env.ALLOWED_ORIGINS = "https://a.com,https://b.com";
    process.env.FORCE_HTTPS = "Yes";
    process.env.LOGIN_RATE_LIMIT_MAX = "9";
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS = "2000";
    await expect(ConfigFile.GetAllowedOrigins()).resolves.toEqual([
      "https://a.com",
      "https://b.com",
    ]);
    await expect(ConfigFile.ShouldForceHttps()).resolves.toBe(true);
    await expect(ConfigFile.GetLoginRateLimitMax()).resolves.toBe(9);
    await expect(ConfigFile.GetLoginRateLimitWindowMs()).resolves.toBe(2000);
  });

  it("should load file backed config values once", async () => {
    const data = JSON.stringify({
      IGNORE_TRAFFIC_TO_REMOVE: "1",
      RENEW_FORCE_TO_PAID: "Yes",
      RENEW_FORCE_TO_LIMITED_AND_EXPIRED: "No",
    });
    (fsMock.promises.readFile as jest.Mock).mockResolvedValueOnce(data);
    await expect(ConfigFile.GetIgnoreTrafficToRemove()).resolves.toBe(1);
    await expect(ConfigFile.GetRenewForceToPaid()).resolves.toBe("Yes");
    await expect(ConfigFile.GetRenewForceToLimitedAndExpired()).resolves.toBe("No");
    expect(fsMock.promises.readFile).toHaveBeenCalledTimes(1);
  });

  it("should throw when required environment variables are missing", async () => {
    delete process.env.MARZBAN_URL;
    await expect(ConfigFile.GetMarzbanURL()).rejects.toThrow(/MARZBAN_URL/);
  });

  it("propagates errors when config file is missing required keys", async () => {
    (fsMock.promises.readFile as jest.Mock).mockRejectedValueOnce({ code: "ENOENT" });
    await expect(ConfigFile.GetIgnoreTrafficToRemove()).rejects.toThrow(/IGNORE_TRAFFIC/);
  });

  it("returns defaults and optional envs when unset", async () => {
    delete process.env.GET_ALL_USERS_FOR_AGENT;
    delete process.env.JWT_ISSUER;
    process.env.JWT_AUDIENCE = "audience";
    await expect(ConfigFile.GetAllUsersForAgent()).resolves.toBe("No");
    await expect(ConfigFile.GetJwtIssuer()).resolves.toBeUndefined();
    await expect(ConfigFile.GetJwtAudience()).resolves.toBe("audience");
  });

  it("uses BACKEND_URL origin when ALLOWED_ORIGINS is not set", async () => {
    delete process.env.ALLOWED_ORIGINS;
    process.env.BACKEND_URL = "https://example.com/back/";
    await expect(ConfigFile.GetAllowedOrigins()).resolves.toEqual(["https://example.com"]);
  });

  it("adds backend origin when ALLOWED_ORIGINS is set and filters invalid entries", async () => {
    process.env.ALLOWED_ORIGINS = "https://a.com,not-a-url";
    process.env.BACKEND_URL = "https://backend.com/api";
    const origins = await ConfigFile.GetAllowedOrigins();
    expect(origins).toContain("https://a.com");
    expect(origins).toContain("https://backend.com");
    expect(origins).not.toContain("not-a-url");
  });

  it("returns wildcard when ALLOWED_ORIGINS contains *", async () => {
    process.env.ALLOWED_ORIGINS = "*,https://a.com";
    const origins = await ConfigFile.GetAllowedOrigins();
    expect(origins).toEqual(["*"]);
  });

  it("ignores empty origin entries and whitespace backend url", async () => {
    process.env.ALLOWED_ORIGINS = " , https://a.com";
    process.env.BACKEND_URL = "   ";
    const origins = await ConfigFile.GetAllowedOrigins();
    expect(origins).toContain("https://a.com");
  });

  it("returns wildcard when ALLOWED_ORIGINS and BACKEND_URL are missing", async () => {
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.BACKEND_URL;
    await expect(ConfigFile.GetAllowedOrigins()).resolves.toEqual(["*"]);
  });

  it("throws when getEnv is called without fallback and value missing", () => {
    const getEnv = (ConfigFile as unknown as { getEnv: (_key: string) => string }).getEnv;
    expect(() => getEnv("MISSING_ENV")).toThrow(/MISSING_ENV/);
  });

  it("skips file load when config already cached", async () => {
    (ConfigFile as unknown as { config: Record<string, string> | undefined }).config = {
      IGNORE_TRAFFIC_TO_REMOVE: "2",
    };
    await (ConfigFile as unknown as { loadFileConfig: () => Promise<void> }).loadFileConfig();
    expect(fsMock.promises.readFile).not.toHaveBeenCalled();
  });

  it("throws when config file read fails unexpectedly", async () => {
    const err = new Error("read fail");
    (fsMock.promises.readFile as jest.Mock).mockRejectedValueOnce(err);
    await expect(ConfigFile.GetIgnoreTrafficToRemove()).rejects.toThrow("read fail");
  });

  it("handles empty config file contents", async () => {
    (fsMock.promises.readFile as jest.Mock).mockResolvedValueOnce("");
    await expect(ConfigFile.GetIgnoreTrafficToRemove()).rejects.toThrow(/IGNORE_TRAFFIC/);
  });

  it("returns empty config when cache is null", async () => {
    (ConfigFile as unknown as { config: Record<string, string> | null }).config = null;
    const config = await (
      ConfigFile as unknown as { getConfig: () => Promise<unknown> }
    ).getConfig();
    expect(config).toEqual({});
  });

  it("throws when renew flags are missing", async () => {
    (fsMock.promises.readFile as jest.Mock).mockResolvedValueOnce("{}");
    await expect(ConfigFile.GetRenewForceToPaid()).rejects.toThrow(/RENEW_FORCE_TO_PAID/);
    await expect(ConfigFile.GetRenewForceToLimitedAndExpired()).rejects.toThrow(
      /RENEW_FORCE_TO_LIMITED_AND_EXPIRED/,
    );
  });

  it("parses session TTL and jwt algorithms with fallbacks", async () => {
    process.env.SESSION_TTL_MINUTES = "0";
    process.env.JWT_ALGORITHMS = " , ";
    await expect(ConfigFile.GetSessionTtlMinutes()).resolves.toBe(30);
    await expect(ConfigFile.GetJwtAlgorithms()).resolves.toEqual(["HS256"]);
  });

  it("returns valid session TTL when configured", async () => {
    process.env.SESSION_TTL_MINUTES = "45";
    await expect(ConfigFile.GetSessionTtlMinutes()).resolves.toBe(45);
  });

  it("parses jwt algorithms list", async () => {
    process.env.JWT_ALGORITHMS = "HS256, HS384";
    await expect(ConfigFile.GetJwtAlgorithms()).resolves.toEqual(["HS256", "HS384"]);
  });

  it("defaults jwt algorithms when env is missing", async () => {
    delete process.env.JWT_ALGORITHMS;
    await expect(ConfigFile.GetJwtAlgorithms()).resolves.toEqual(["HS256"]);
  });

  it("falls back when rate limit env values are invalid", async () => {
    process.env.LOGIN_RATE_LIMIT_MAX = "0";
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS = "NaN";
    await expect(ConfigFile.GetLoginRateLimitMax()).resolves.toBe(5);
    await expect(ConfigFile.GetLoginRateLimitWindowMs()).resolves.toBe(60000);
  });

  it("reads additional env-backed config values", async () => {
    process.env.DELETE_PAIDANDREMOVED_USERS = "Yes";
    process.env.MARZBAN_FLOW = "flow";
    process.env.PANEL_DB_DATABASE = "db";
    process.env.PANEL_DB_USERNAME = "user";
    process.env.PANEL_DB_PASSWORD = "pass";
    process.env.JWT_SECRET = "secret";
    process.env.JWT_EXPIRES_IN = "15m";

    await expect(ConfigFile.GetDeletePaidAndRemovedUsers()).resolves.toBe("Yes");
    await expect(ConfigFile.GetMarzbanFlow()).resolves.toBe("flow");
    await expect(ConfigFile.GetPanelDbDatabase()).resolves.toBe("db");
    await expect(ConfigFile.GetPanelDbUsername()).resolves.toBe("user");
    await expect(ConfigFile.GetPanelDbPassword()).resolves.toBe("pass");
    await expect(ConfigFile.GetJwtSecret()).resolves.toBe("secret");
    await expect(ConfigFile.GetJwtExpiresIn()).resolves.toBe("15m");
  });
});
