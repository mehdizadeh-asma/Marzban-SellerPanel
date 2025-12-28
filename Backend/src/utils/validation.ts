import { Types } from "mongoose";
import type { ParsedQs } from "qs";

type QueryValue = string | ParsedQs | Array<string | ParsedQs> | undefined;

export const isValidObjectId = (value: string | undefined): value is string =>
  typeof value === "string" && Types.ObjectId.isValid(value);

export const normalizeQueryValue = (value: QueryValue): string | undefined => {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return typeof value === "string" ? value : undefined;
};

export const parsePagination = (
  pageValue: QueryValue,
  limitValue: QueryValue,
): { page?: number; limit?: number } => {
  const page = Number(normalizeQueryValue(pageValue));
  const limit = Number(normalizeQueryValue(limitValue));
  if (Number.isFinite(limit) && limit > 0) {
    return {
      page: Number.isFinite(page) && page > 0 ? page : 1,
      limit,
    };
  }
  return {};
};
