import type { Request } from "express";
import "../helpers";
import type { MockResponse } from "../helpers";
import { mockNext, mockResponse } from "../helpers";

const TariffInboundController = require("../../src/controllers/TariffInboundController").default;

describe("TariffInboundController", () => {
  beforeEach(() => jest.resetAllMocks());

  it("should return merged tariff inbound list with tariffId for matched tags", async () => {
    const req: Partial<Request> = {
      params: { tariffId: "0000000000000000000000aa" },
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const tariffInbounds = [{ InboundTag: "in1" }, { InboundTag: "in2" }];

    const allInbound = [
      { InboundTag: "in1", InboundType: "t1" },
      { InboundTag: "in3", InboundType: "t2" },
    ];

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      find: jest.fn().mockResolvedValue(tariffInbounds),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.GetInbounds)
      ah.default.GetInbounds.mockResolvedValue(allInbound);
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const tres: MockResponse = res;
    await TariffInboundController.GetTariffInboundListByTariffId(req as Request, tres, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres.status).toHaveBeenCalledWith(200);
    expect(tres.json).toHaveBeenCalled();
    const returned = (tres.json as jest.Mock).mock.calls[0][0] as Array<Record<string, unknown>>;
    // entries with matching tag should have tariffId, others empty
    const in1 = returned.find((r) => (r.InboundTag as string) === "in1");
    const in3 = returned.find((r) => (r.InboundTag as string) === "in3");
    expect(in1!["TariffId"]).toBe(req.params!.tariffId);
    expect(in3!["TariffId"]).toBe("");
  });

  it("should delete old entries and insert new ones for AssignTariffInbound", async () => {
    const req: Partial<Request> = {
      params: { tariffid: "0000000000000000000000bb" },
      body: [{ InboundTag: "x", InboundType: "t" }],
      headers: { authorization: "token" },
    };
    const res = mockResponse();
    const next = mockNext();

    const insertResult = [{ _id: "1" }];

    const mocked = jest.requireMock("../../src/utils/MongooseModel");
    mocked.getModel.mockImplementationOnce(() => ({
      deleteMany: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockResolvedValue(insertResult),
    }));

    const ah = jest.requireMock("../../src/utils/AccountHelpers");
    if (ah && ah.default && ah.default.CheckToken) ah.default.CheckToken.mockResolvedValue(true);

    const tres2: MockResponse = res;
    await TariffInboundController.AssignTariffInbound(req as Request, tres2, next);

    if ((next as jest.Mock).mock.calls.length > 0) throw (next as jest.Mock).mock.calls[0][0];

    expect(tres2.status).toHaveBeenCalledWith(200);
    expect(tres2.json).toHaveBeenCalledWith({
      message: "Inbounds successfully assigned to Package.",
      result: insertResult,
    });
  });
});
