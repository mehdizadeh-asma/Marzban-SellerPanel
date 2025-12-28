import Helper from "../../src/utils/Helper";

describe("Helper utilities", () => {
  const baseDate = new Date("2023-01-01T00:00:00Z");
  const baseTimestamp = Math.floor(baseDate.getTime() / 1000);

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseDate);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("calculates remaining date strings", () => {
    const future = baseTimestamp + 2 * 24 * 60 * 60;
    expect(Helper.CalculateRemainDate(future)).toBe("1 Day Left");

    const past = baseTimestamp - 24 * 60 * 60;
    expect(Helper.CalculateRemainDate(past)).toBe("2 Day Expired");

    expect(Helper.CalculateRemainDate(null as unknown as number)).toBe("Never");
  });

  it("detects online state correctly", () => {
    const twoMinutesAgo = new Date(baseDate.getTime() - 2 * 60 * 1000).toISOString();
    expect(Helper.IsOnline(twoMinutesAgo)).toBe("Online");

    const tenMinutesAgo = new Date(baseDate.getTime() - 10 * 60 * 1000).toISOString();
    expect(Helper.IsOnline(tenMinutesAgo)).toBe("Offline");

    expect(Helper.IsOnline(null as unknown as string)).toBe("Never");
  });

  it("calculates last online date with various ranges", () => {
    const threeDaysAgo = new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(Helper.CalculateOnlineDate(threeDaysAgo)).toBe("2 Days ago");

    const twoHoursThirtyAgo = new Date(
      baseDate.getTime() - (2 * 60 + 30) * 60 * 1000,
    ).toISOString();
    expect(Helper.CalculateOnlineDate(twoHoursThirtyAgo)).toBe("2 Hours 29 Minutes ago");

    const tenMinutesAgo = new Date(baseDate.getTime() - 10 * 60 * 1000).toISOString();
    expect(Helper.CalculateOnlineDate(tenMinutesAgo)).toBe("9 Minutes ago");

    const oneMinuteAgo = new Date(baseDate.getTime() - 60 * 1000).toISOString();
    expect(Helper.CalculateOnlineDate(oneMinuteAgo)).toBe("Online");

    expect(Helper.CalculateOnlineDate(null as unknown as string)).toBe("Never");
  });

  it("calculates subscription update dates", () => {
    const twoDaysAgo = new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(Helper.CalculateUpdateSubscriptionDate(twoDaysAgo)).toBe("1 Days ago");

    const ninetyMinutesAgo = new Date(baseDate.getTime() - 90 * 60 * 1000).toISOString();
    expect(Helper.CalculateUpdateSubscriptionDate(ninetyMinutesAgo)).toBe("1 Hours 29 Minutes ago");

    const fifteenMinutesAgo = new Date(baseDate.getTime() - 15 * 60 * 1000).toISOString();
    expect(Helper.CalculateUpdateSubscriptionDate(fifteenMinutesAgo)).toBe("14 Minutes ago");

    expect(Helper.CalculateUpdateSubscriptionDate(null as unknown as string)).toBe("Never");
  });

  it("formats traffic units", () => {
    expect(Helper.CalculateTraffic(500)).toBe("500 B");
    expect(Helper.CalculateTraffic(1024)).toBe("1.00 KB");
    expect(Helper.CalculateTraffic(1024 * 1024)).toBe("1.00 MB");
    expect(Helper.CalculateTraffic(1024 * 1024 * 1024)).toBe("1.00 GB");
    expect(Helper.CalculateTraffic(1024 * 1024 * 1024 * 1024)).toBe("1.00 TB");
    expect(Helper.CalculateTraffic(1024 * 1024 * 1024 * 1024 * 5)).toBe("5.00 TB");
    expect(Helper.CalculateTraffic(1024 ** 5)).toBe((1024 ** 5).toString());
  });

  it("generates random passwords with allowed characters", () => {
    const password = Helper.GenerateRandomPassword(64);
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789~!@#$%^&";

    expect(password).toHaveLength(64);
    for (const ch of password) {
      expect(charset.includes(ch)).toBe(true);
    }
  });

  it("returns empty password for non-positive lengths", () => {
    expect(Helper.GenerateRandomPassword(0)).toBe("");
    expect(Helper.GenerateRandomPassword(-1)).toBe("");
  });
});
