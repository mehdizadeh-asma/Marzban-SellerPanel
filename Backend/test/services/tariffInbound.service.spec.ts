import {
  assignTariffInbound,
  getTariffInboundListByTariffId,
} from "../../src/services/TariffInboundService";

describe("TariffInboundService", () => {
  it("throws when tariffId is invalid in getTariffInboundListByTariffId", async () => {
    await expect(getTariffInboundListByTariffId("bad")).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });

  it("throws when tariffId is invalid in assignTariffInbound", async () => {
    await expect(assignTariffInbound("bad", [])).rejects.toMatchObject({
      status: 400,
      message: "Invalid tariff id",
    });
  });
});
