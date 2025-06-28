import Mongoose from "./MongooseDbManagement";
import { Schema, Model, Connection, Document } from "mongoose";

export async function getModel<T extends Document>(
  name: string,
  schema: Schema
): Promise<Model<T>> {
  await Mongoose.connectMainDatabase();
  const mainConn: Connection | null = Mongoose.getMainConnection();
  if (!mainConn) throw new Error("Database connection error");
  return mainConn.models[name] || mainConn.model<T>(name, schema);
}
