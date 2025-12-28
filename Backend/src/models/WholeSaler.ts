import type { HydratedDocument, Types } from "mongoose";
import { Schema } from "mongoose";

export interface IWholeSaler {
  _id: Types.ObjectId;
  Owner: string;
  MarzbanUrl: string;
  SN: string;
  ExpireDate: Date;
  Cluster: string;
  Database: string;
  DbUsername: string;
  DbPassword: string;
}

export type WholeSalerDocument = HydratedDocument<IWholeSaler>;

export const WholeSalerSchema = new Schema<IWholeSaler>({
  Owner: { type: String, required: [true, "Owner is required"] },

  MarzbanUrl: {
    type: String,
    index: true,
    required: [true, "MarzbanUrl is required"],
  },

  SN: { type: String, index: true, required: [true, "SN is required"] },

  ExpireDate: { type: Date, required: [true, "ExpireDate is required"] },

  Cluster: { type: String, required: [true, "Cluster is required"] },

  Database: { type: String, required: [true, "Database is required"] },

  DbUsername: { type: String, required: [true, "DbUsername is required"] },

  DbPassword: { type: String, required: [true, "DbPassword is required"] },
});
