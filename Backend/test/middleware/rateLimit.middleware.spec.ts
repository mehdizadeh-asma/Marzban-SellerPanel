import type { Request, Response } from "express";

jest.mock("../../src/config/Config", () => ({
  __esModule: true,
  default: {
    GetLoginRateLimitMax: jest.fn().mockResolvedValue(2),
    GetLoginRateLimitWindowMs: jest.fn().mockResolvedValue(1000),
  },
}));

const { createLoginRateLimiter } = require("../../src/middleware/rateLimit");

const execLimiter = (
  middleware: ReturnType<typeof createLoginRateLimiter>,
  reqOverrides: Partial<Request> = {},
): Promise<{ type: "next" } | { type: "blocked"; status: number; body: unknown }> => {
  return new Promise((resolve) => {
    const req = {
      ip: "1.1.1.1",
      socket: { remoteAddress: "1.1.1.1" } as unknown as Request["socket"],
      ...reqOverrides,
    } as unknown as Request;
    const statusMock = jest.fn().mockReturnThis();
    const res = {
      status: statusMock,
      json: jest.fn((body: unknown) =>
        resolve({
          type: "blocked",
          status: statusMock.mock.calls[0][0],
          body,
        }),
      ),
    } as unknown as Response;
    const next = () => resolve({ type: "next" });
    middleware(req, res, next);
  });
};

describe("rateLimit middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows requests until threshold is reached", async () => {
    const limiter = createLoginRateLimiter();
    const first = await execLimiter(limiter);
    const second = await execLimiter(limiter);
    const third = await execLimiter(limiter);
    expect(first.type).toBe("next");
    expect(second.type).toBe("next");
    expect(third).toMatchObject({ type: "blocked", status: 429 });
  });

  it("uses socket remote address when req.ip is missing", async () => {
    const limiter = createLoginRateLimiter();
    const res = await execLimiter(limiter, {
      ip: undefined,
      socket: { remoteAddress: "10.0.0.1" } as unknown as Request["socket"],
    });
    expect(res.type).toBe("next");
  });

  it("prefers socket address when req.ip is localhost", async () => {
    const limiter = createLoginRateLimiter();
    const res = await execLimiter(limiter, {
      ip: "::1",
      socket: { remoteAddress: "10.0.0.2" } as unknown as Request["socket"],
    });
    expect(res.type).toBe("next");
  });

  it("uses req.ip when it is non-local", async () => {
    const limiter = createLoginRateLimiter();
    const res = await execLimiter(limiter, {
      ip: "8.8.8.8",
      socket: { remoteAddress: "10.0.0.3" } as unknown as Request["socket"],
    });
    expect(res.type).toBe("next");
  });

  it("uses socket address when req.ip is localhost v4-mapped", async () => {
    const limiter = createLoginRateLimiter();
    const res = await execLimiter(limiter, {
      ip: "::ffff:127.0.0.1",
      socket: { remoteAddress: "10.0.0.4" } as unknown as Request["socket"],
    });
    expect(res.type).toBe("next");
  });

  it("falls back to unknown when no ip is available", async () => {
    const limiter = createLoginRateLimiter();
    const res = await execLimiter(limiter, {
      ip: undefined,
      socket: { remoteAddress: undefined } as unknown as Request["socket"],
    });
    expect(res.type).toBe("next");
  });

  it("cleans up expired attempts and clears the interval", async () => {
    jest.useFakeTimers();
    const clearSpy = jest.spyOn(global, "clearInterval");
    const limiter = createLoginRateLimiter();
    await execLimiter(limiter);

    jest.advanceTimersByTime(1000);
    jest.runOnlyPendingTimers();

    const res = await execLimiter(limiter);
    expect(res.type).toBe("next");
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
    jest.useRealTimers();
  });

  it("keeps attempts when they are not expired", async () => {
    jest.useFakeTimers();
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1000);
    const limiter = createLoginRateLimiter();
    await execLimiter(limiter);

    jest.advanceTimersByTime(1000);
    jest.runOnlyPendingTimers();

    nowSpy.mockRestore();
    jest.useRealTimers();
  });

  it("continues when ensureOptions rejects", async () => {
    jest.resetModules();
    const config = require("../../src/config/Config").default;
    config.GetLoginRateLimitMax.mockRejectedValueOnce(new Error("boom"));
    const { createLoginRateLimiter: createLimiter } = require("../../src/middleware/rateLimit");
    const limiter = createLimiter();
    const req = {
      ip: "1.1.1.1",
      socket: { remoteAddress: "1.1.1.1" } as unknown as Request["socket"],
    } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    limiter(req, res, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalled();
  });
});
