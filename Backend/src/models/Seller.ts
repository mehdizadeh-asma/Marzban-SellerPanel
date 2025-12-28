import type { HydratedDocument, Types } from "mongoose";
import { Schema } from "mongoose";

export interface ISeller {
  _id: Types.ObjectId;
  Title: string;
  Username: string;
  Password: string;
  MarzbanUsername: string;
  MarzbanPassword: string;
  Counter: number;
  Limit: number;
  Status: "Active" | "Deactive";
}

export type SellerDocument = HydratedDocument<ISeller>;

export const SellerSchema = new Schema<ISeller>({
  Title: { type: String, unique: true, required: [true, "Title is required"] },
  Username: {
    type: String,
    unique: true,
    required: [true, "Username is required"],
  },
  Password: { type: String, required: [true, "Password is required"] },
  MarzbanUsername: {
    type: String,
    unique: true,
    required: [true, "MarzbanUsername is required"],
  },
  MarzbanPassword: { type: String, required: [true, "Password is required"] },
  Counter: { type: Number, default: 0 },
  Limit: { type: Number, default: 0 },
  Status: {
    type: String,
    enum: {
      values: ["Active", "Deactive"],
      message: "{VALUE} is not supported",
    },
    default: "Active",
  },
});
