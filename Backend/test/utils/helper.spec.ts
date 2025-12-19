import Helper from "../../src/utils/Helper";

describe("Helper utils", () => {
  it("should calculate remaining date as left/expired/never correctly", () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const twoDaysLater = nowSec + 2 * 24 * 3600;
    const twoDaysAgo = nowSec - 2 * 24 * 3600;

    expect(Helper.CalculateRemainDate(twoDaysLater)).toMatch(/Day Left$/);
    expect(Helper.CalculateRemainDate(twoDaysAgo)).toMatch(/Day Expired$/);
    expect(Helper.CalculateRemainDate(null as unknown as number)).toBe("Never");
  });

  it("should compute online status and update subscription dates correctly", () => {
    const recent = new Date(Date.now() - 60 * 1000).toISOString(); // 1 minute ago
    const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const twoDays = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    expect(Helper.IsOnline(recent)).toBe("Online");
    expect(Helper.IsOnline(null as unknown as string)).toBe("Never");

    expect(Helper.CalculateOnlineDate(recent)).toBe("Online");
    expect(Helper.CalculateOnlineDate(fiveMin)).toMatch(/Minutes ago$/);
    expect(Helper.CalculateOnlineDate(twoDays)).toMatch(/Days ago$/);

    expect(Helper.CalculateUpdateSubscriptionDate(recent)).toMatch(/Minutes ago|Online/);
    expect(Helper.CalculateUpdateSubscriptionDate(twoDays)).toMatch(/Days ago/);
  });

  it("should format traffic bytes correctly", () => {
    expect(Helper.CalculateTraffic(500)).toBe("500 B");
    expect(Helper.CalculateTraffic(1500)).toMatch(/KB$/);
    expect(Helper.CalculateTraffic(2 * 1024 * 1024)).toMatch(/MB$/);
  });

  it("should generate a random password with correct length", () => {
    const p = Helper.GenerateRandomPassword(12);
    expect(typeof p).toBe("string");
    expect(p).toHaveLength(12);
  });
});

// --- merged from helpers.coverage.spec.ts ---
const {
  mockResponse,
  mockNext,
  createModelMock,
  mockConfigDefaults,
  resetAllMocks,
} = require("../../jest.setup");

describe("Helpers coverage", () => {
  it("should return an Express-like mock response that supports chaining", () => {
    const res = mockResponse();
    expect(typeof res.status).toBe("function");
    expect(typeof res.json).toBe("function");
    expect(typeof res.send).toBe("function");

    res.status(201).json({ ok: true });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("should return a mock next function that records calls", () => {
    const next = mockNext();
    expect(typeof next).toBe("function");
    next("err");
    expect(next).toHaveBeenCalledWith("err");
  });

  it("should return model-like stubs and respect override values", async () => {
    const model = createModelMock({ find: [{ a: 1 }], deleteMany: { deletedCount: 5 } });
    expect(typeof model.find).toBe("function");
    const found = await model.find();
    expect(found).toEqual([{ a: 1 }]);
    const deleted = await model.deleteMany();
    expect(deleted).toEqual({ deletedCount: 5 });
  });

  it("should set or override default Config mock values", async () => {
    const cf = mockConfigDefaults({ GetMarzbanFlow: jest.fn().mockResolvedValue("override") });
    expect(typeof cf.GetMarzbanFlow).toBe("function");
    const v = await cf.GetMarzbanFlow();
    expect(v).toBe("override");

    resetAllMocks();
  });
});
