import type { Connection, Document, Model, Schema } from "mongoose";

import Mongoose from "./MongooseDbManagement";

type GenericDoc = Document & { _id: unknown };

export async function getModel<T extends GenericDoc = GenericDoc>(
  name: string,
  schema: Schema,
): Promise<Model<T>> {
  await Mongoose.connectMainDatabase();
  const mainConn: Connection | null = Mongoose.getMainConnection();
  if (!mainConn) throw new Error("Database connection error");
  return (mainConn.models[name] as Model<T>) || mainConn.model<T>(name, schema);
}
