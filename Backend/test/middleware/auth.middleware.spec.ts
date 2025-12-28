import type { AuthenticatedRequest } from "../../src/middleware/auth";

const verifyAccessToken = jest.fn();
const getSessionById = jest.fn();
const invalidateSession = jest.fn();

jest.mock("../../src/services/auth/AuthService", () => ({
  __esModule: true,
  AuthService: {
    verifyAccessToken,
    getSessionById,
    invalidateSession,
  },
}));

const {
  authenticate,
  requireAdmin,
  requireSeller,
  requireSellerOrAdmin,
} = require("../../src/middleware/auth");

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

const createRes = (): MockResponse => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

describe("auth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("authenticates request and populates user context", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
    } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    verifyAccessToken.mockResolvedValue({
      sessionId: "session-id",
      role: "seller",
      sellerId: "seller-id",
    });
    getSessionById.mockResolvedValue({
      _id: { toString: () => "session-id" },
      role: "seller",
      sellerId: "seller-id",
      expiresAt: new Date(Date.now() + 60_000),
      marzbanTokenExpiresAt: new Date(Date.now() + 60_000),
      marzbanToken: "token-upstream",
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.role).toBe("seller");
    expect(req.marzbanToken).toBe("Bearer token-upstream");
  });

  it("returns 401 when Authorization header missing", async () => {
    const req = { headers: {} } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when session is missing", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
    } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    verifyAccessToken.mockResolvedValue({
      sessionId: "session-id",
      role: "seller",
      sellerId: "seller-id",
    });
    getSessionById.mockResolvedValue(null);

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when token payload mismatches session", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
    } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    verifyAccessToken.mockResolvedValue({
      sessionId: "sid",
      role: "admin",
      sellerId: null,
    });
    getSessionById.mockResolvedValue({
      _id: { toString: () => "sid" },
      role: "seller",
      sellerId: "seller-id",
      expiresAt: new Date(Date.now() + 60_000),
      marzbanTokenExpiresAt: new Date(Date.now() + 60_000),
      marzbanToken: "token",
    });

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when seller session lacks sellerId", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
    } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    verifyAccessToken.mockResolvedValue({
      sessionId: "sid",
      role: "seller",
      sellerId: null,
    });
    getSessionById.mockResolvedValue({
      _id: { toString: () => "sid" },
      role: "seller",
      sellerId: null,
      expiresAt: new Date(Date.now() + 60_000),
      marzbanTokenExpiresAt: new Date(Date.now() + 60_000),
      marzbanToken: "token",
    });

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("invalidates session when expired", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
    } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    verifyAccessToken.mockResolvedValue({
      sessionId: "sid",
      role: "seller",
      sellerId: "seller-id",
    });
    getSessionById.mockResolvedValue({
      _id: { toString: () => "sid" },
      role: "seller",
      sellerId: "seller-id",
      expiresAt: new Date(Date.now() - 1000),
      marzbanTokenExpiresAt: new Date(Date.now() + 60_000),
      marzbanToken: "token",
    });

    await authenticate(req, res, next);
    expect(invalidateSession).toHaveBeenCalledWith("sid");
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("keeps marzban token when it already has Bearer prefix", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
    } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    verifyAccessToken.mockResolvedValue({
      sessionId: "session-id",
      role: "seller",
      sellerId: "seller-id",
    });
    getSessionById.mockResolvedValue({
      _id: { toString: () => "session-id" },
      role: "seller",
      sellerId: "seller-id",
      expiresAt: new Date(Date.now() + 60_000),
      marzbanTokenExpiresAt: new Date(Date.now() + 60_000),
      marzbanToken: "Bearer upstream",
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.marzbanToken).toBe("Bearer upstream");
    expect(req.headers.authorization).toBe("Bearer upstream");
  });

  it("returns 401 when verification throws", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
    } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    verifyAccessToken.mockRejectedValue(new Error("bad token"));

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("invalidates session when marzban token is expired", async () => {
    const req = {
      headers: { authorization: "Bearer token" },
    } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();

    verifyAccessToken.mockResolvedValue({
      sessionId: "sid",
      role: "seller",
      sellerId: "seller-id",
    });
    getSessionById.mockResolvedValue({
      _id: { toString: () => "sid" },
      role: "seller",
      sellerId: "seller-id",
      expiresAt: new Date(Date.now() + 60_000),
      marzbanTokenExpiresAt: new Date(Date.now() - 1000),
      marzbanToken: "token",
    });

    await authenticate(req, res, next);

    expect(invalidateSession).toHaveBeenCalledWith("sid");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("requireAdmin allows only admin role", () => {
    const req = { user: { role: "admin" } } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();

    const sellerReq = { user: { role: "seller" } } as unknown as AuthenticatedRequest;
    requireAdmin(sellerReq, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("requireSeller allows only seller role", () => {
    const req = { user: { role: "seller" } } as unknown as AuthenticatedRequest;
    const res = createRes();
    const next = jest.fn();
    requireSeller(req, res, next);
    expect(next).toHaveBeenCalled();

    const adminReq = { user: { role: "admin" } } as unknown as AuthenticatedRequest;
    requireSeller(adminReq, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("requireSellerOrAdmin allows both roles", () => {
    const res = createRes();
    const next = jest.fn();
    const makeReq = (role: "seller" | "admin"): AuthenticatedRequest => {
      return { user: { role } } as unknown as AuthenticatedRequest;
    };
    requireSellerOrAdmin(makeReq("seller"), res, next);
    requireSellerOrAdmin(makeReq("admin"), res, next);
    expect(next).toHaveBeenCalledTimes(2);

    const invalidReq = { user: { role: "guest" } } as unknown as AuthenticatedRequest;
    requireSellerOrAdmin(invalidReq, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
