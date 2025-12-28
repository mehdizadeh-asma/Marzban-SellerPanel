import { Types } from "mongoose";
import type { ParsedQs } from "qs";

import { isValidObjectId, normalizeQueryValue, parsePagination } from "../../src/utils/validation";

describe("validation utils", () => {
  it("normalizes query value arrays", () => {
    expect(normalizeQueryValue(["1", "2"])).toBe("1");
    expect(normalizeQueryValue([{} as ParsedQs])).toBeUndefined();
    expect(normalizeQueryValue("x")).toBe("x");
    expect(normalizeQueryValue(undefined)).toBeUndefined();
  });

  it("parses pagination when limit is valid", () => {
    const result = parsePagination(["2"], ["10"]);
    expect(result).toEqual({ page: 2, limit: 10 });
  });

  it("defaults to page 1 when page is invalid", () => {
    const result = parsePagination("bad", "5");
    expect(result).toEqual({ page: 1, limit: 5 });
  });

  it("returns empty pagination when limit is invalid", () => {
    expect(parsePagination("1", "0")).toEqual({});
    expect(parsePagination("1", undefined)).toEqual({});
  });

  it("validates object ids", () => {
    expect(isValidObjectId(new Types.ObjectId().toString())).toBe(true);
    expect(isValidObjectId("bad")).toBe(false);
  });
});
