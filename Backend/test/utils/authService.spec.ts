import jwt from "jsonwebtoken";

/// <reference types="jest" />

const configMock = {
  GetSessionTtlMinutes: jest.fn().mockResolvedValue(30),
  GetJwtExpiresIn: jest.fn().mockResolvedValue("1h"),
  GetJwtSecret: jest.fn().mockResolvedValue("unit-test-secret"),
  GetJwtIssuer: jest.fn().mockResolvedValue(undefined),
  GetJwtAudience: jest.fn().mockResolvedValue(undefined),
  GetJwtAlgorithms: jest.fn().mockResolvedValue(["HS256"]),
};

jest.mock("../../src/config/Config", () => ({
  __esModule: true,
  default: configMock,
}));

const createMock = jest.fn();
const findByIdMock = jest.fn();
const deleteOneMock = jest.fn();

jest.mock("../../src/db/MongooseModel", () => ({
  getModel: jest.fn().mockResolvedValue({
    create: createMock,
    findById: findByIdMock,
    deleteOne: deleteOneMock,
  }),
}));

const { AuthService } = require("../../src/services/auth/AuthService");

describe("AuthService", () => {
  const fakeSession = {
    _id: { toString: () => "session-id" },
    marzbanToken: "Bearer abc",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue({
      ...fakeSession,
      marzbanToken: "Bearer internal",
      userId: "user-id",
      sellerId: "seller-id",
      role: "seller",
      marzbanTokenExpiresAt: new Date(),
      expiresAt: new Date(),
    });
    findByIdMock.mockResolvedValue(fakeSession);
    deleteOneMock.mockResolvedValue({ deletedCount: 1 });
  });

  it("creates session and token", async () => {
    const result = await AuthService.createSessionAndToken({
      role: "seller",
      userId: "user-id",
      sellerId: "seller-id",
      marzbanToken: "Bearer internal",
    });

    expect(createMock).toHaveBeenCalled();
    expect(result.accessToken).toEqual(expect.any(String));
    const decoded = jwt.verify(result.accessToken, "unit-test-secret") as jwt.JwtPayload;
    expect(decoded.role).toBe("seller");
    expect(result.session).toMatchObject({ marzbanToken: "Bearer internal" });
  });

  it("retrieves session by id", async () => {
    const session = await AuthService.getSessionById("session");
    expect(findByIdMock).toHaveBeenCalledWith("session");
    expect(session).toBe(fakeSession);
  });

  it("invalidates session", async () => {
    await AuthService.invalidateSession("session");
    expect(deleteOneMock).toHaveBeenCalledWith({ _id: "session" });
  });

  it("verifies access token using configured secret", async () => {
    const token = jwt.sign({ test: "ok" }, "unit-test-secret");
    const payload = await AuthService.verifyAccessToken(token);
    expect(payload).toMatchObject({ test: "ok" });
  });

  it("verifies access token with issuer, audience, and fallback algorithms", async () => {
    configMock.GetJwtIssuer.mockResolvedValueOnce("issuer");
    configMock.GetJwtAudience.mockResolvedValueOnce("audience");
    configMock.GetJwtAlgorithms.mockResolvedValueOnce(["RS256"]);
    const token = jwt.sign({ test: "ok" }, "unit-test-secret", {
      issuer: "issuer",
      audience: "audience",
      algorithm: "HS256",
    });
    const payload = await AuthService.verifyAccessToken(token);
    expect(payload).toMatchObject({ test: "ok" });
  });

  it("adds issuer and audience when configured", async () => {
    configMock.GetJwtIssuer.mockResolvedValueOnce("issuer");
    configMock.GetJwtAudience.mockResolvedValueOnce("audience");
    const result = await AuthService.createSessionAndToken({
      role: "seller",
      userId: "user-id" as unknown as never,
      marzbanToken: "Bearer token",
    });
    const decoded = jwt.verify(result.accessToken, "unit-test-secret", {
      issuer: "issuer",
      audience: "audience",
    }) as jwt.JwtPayload;
    expect(decoded.sub).toBe("user-id");
  });

  it("falls back to HS256 and uses sellerId when userId is missing", async () => {
    const sellerId = "seller-only";
    configMock.GetJwtAlgorithms.mockResolvedValueOnce(["RS256"]);
    const result = await AuthService.createSessionAndToken({
      role: "seller",
      sellerId: sellerId as unknown as never,
      marzbanToken: "Bearer token",
    });
    const decoded = jwt.verify(result.accessToken, "unit-test-secret") as jwt.JwtPayload;
    expect(decoded.sub).toBe(sellerId);
    expect(decoded.sellerId).toBe(sellerId);
  });

  it("uses session id when both userId and sellerId are missing", async () => {
    const sessionId = "session-id";
    createMock.mockResolvedValueOnce({
      _id: { toString: () => sessionId },
      marzbanToken: "Bearer internal",
      role: "admin",
      expiresAt: new Date(),
    });
    const result = await AuthService.createSessionAndToken({
      role: "admin",
      marzbanToken: "Bearer token",
    });
    const decoded = jwt.verify(result.accessToken, "unit-test-secret") as jwt.JwtPayload;
    expect(decoded.sub).toBe(sessionId);
    expect(decoded.sellerId).toBeNull();
  });
});
