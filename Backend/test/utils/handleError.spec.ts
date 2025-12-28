import type { Response } from "express";

import { handleControllerError } from "../../src/utils/handleError";
import { getHttpErrorCode, HttpError } from "../../src/utils/HttpError";

describe("handleControllerError", () => {
  it("formats HttpError responses with code", () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn();

    handleControllerError(new HttpError(400, "Bad request"), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Bad request", code: "BAD_REQUEST" });
    expect(next).not.toHaveBeenCalled();
  });

  it("falls back to status-derived code when error code is missing", () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn();
    const err = new HttpError(400, "Bad request");
    (err as { code?: string }).code = undefined;

    handleControllerError(err, res, next);

    expect(res.json).toHaveBeenCalledWith({ message: "Bad request", code: "BAD_REQUEST" });
  });

  it("passes non-HttpError to next", () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn();
    const error = new Error("boom");

    handleControllerError(error, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("getHttpErrorCode", () => {
  it("returns fallback code for unknown status", () => {
    expect(getHttpErrorCode(418)).toBe("HTTP_418");
  });
});
