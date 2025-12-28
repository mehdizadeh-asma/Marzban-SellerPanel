import type { Connection, Model, Schema } from "mongoose";

import Mongoose from "./MongooseDbManagement";

export async function getModel<TRawDocType>(
  name: string,
  schema: Schema<TRawDocType>,
): Promise<Model<TRawDocType>> {
  await Mongoose.connectMainDatabase();
  const mainConn: Connection | null = Mongoose.getMainConnection();
  if (!mainConn) throw new Error("Database connection error");
  const existingModel = mainConn.models[name] as Model<TRawDocType> | undefined;
  return existingModel ?? mainConn.model<TRawDocType>(name, schema);
}
