import type { ClientSession } from "mongoose";

import { HttpError } from "../utils/HttpError";
import MongooseDbManagement from "./MongooseDbManagement";

export const withMainTransaction = async <T>(
  handler: (_session: ClientSession) => Promise<T>,
): Promise<T> => {
  const connection = MongooseDbManagement.getMainConnection();
  if (!connection) {
    throw new HttpError(500, "Database connection error");
  }
  const session = await connection.startSession();
  try {
    session.startTransaction();
    const result = await handler(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};
