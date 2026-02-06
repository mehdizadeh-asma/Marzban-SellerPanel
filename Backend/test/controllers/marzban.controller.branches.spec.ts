import type { AuthenticatedRequest } from "../../src/middleware/auth";

import MarzbanController from "../../src/controllers/MarzbanController";
import * as MarzbanService from "../../src/services/MarzbanService";

jest.mock("../../src/services/MarzbanService");

type MockResponse = {
  status: jest.Mock;
  json: jest.Mock;
};

const createReq = (overrides: Partial<AuthenticatedRequest> = {}) =>
  ({
    body: {},
    params: {},
    headers: {},
    ...overrides,
  }) as AuthenticatedRequest;

const createRes = (): MockResponse => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const mockedMarzban = MarzbanService as jest.Mocked<typeof MarzbanService>;

describe("MarzbanController param fallbacks", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("falls back to empty search when missing in GetAccount", async () => {
    mockedMarzban.getAccount.mockResolvedValue({ ok: true } as never);
    const res = createRes();

    await MarzbanController.GetAccount(createReq({ params: {} }), res as never, jest.fn());

    expect(mockedMarzban.getAccount).toHaveBeenCalledWith(expect.objectContaining({ search: "" }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("falls back to empty username when missing in EditAccount", async () => {
    mockedMarzban.editAccount.mockResolvedValue({ ok: true } as never);
    const res = createRes();

    await MarzbanController.EditAccount(createReq({ params: {} }), res as never, jest.fn());

    expect(mockedMarzban.editAccount).toHaveBeenCalledWith(
      expect.objectContaining({ username: "" }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("falls back to empty username when missing in DisableAccount", async () => {
    mockedMarzban.disableAccount.mockResolvedValue({ ok: true } as never);
    const res = createRes();

    await MarzbanController.DisableAccount(
      createReq({ params: {}, body: { status: "active" } }),
      res as never,
      jest.fn(),
    );

    expect(mockedMarzban.disableAccount).toHaveBeenCalledWith(
      expect.objectContaining({ username: "" }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("falls back to empty username when missing in RemoveAccount", async () => {
    mockedMarzban.removeAccount.mockResolvedValue(undefined as never);
    const res = createRes();

    await MarzbanController.RemoveAccount(createReq({ params: {} }), res as never, jest.fn());

    expect(mockedMarzban.removeAccount).toHaveBeenCalledWith(
      expect.objectContaining({ username: "" }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("falls back to empty username when missing in RevokeSub", async () => {
    mockedMarzban.revokeSub.mockResolvedValue(undefined as never);
    const res = createRes();

    await MarzbanController.RevokeSub(createReq({ params: {} }), res as never, jest.fn());

    expect(mockedMarzban.revokeSub).toHaveBeenCalledWith(expect.objectContaining({ username: "" }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
