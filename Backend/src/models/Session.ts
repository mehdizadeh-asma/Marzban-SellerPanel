import type { HydratedDocument } from "mongoose";
import { Schema, Types } from "mongoose";

export type SessionRole = "admin" | "seller";

export interface ISession {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  sellerId?: Types.ObjectId;
  role: SessionRole;
  marzbanToken: string;
  marzbanTokenExpiresAt: Date;
  expiresAt: Date;
}

export type SessionDocument = HydratedDocument<ISession>;

export const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Types.ObjectId, ref: "Seller" },
    sellerId: { type: Types.ObjectId, ref: "Seller" },
    role: {
      type: String,
      enum: ["admin", "seller"],
      required: true,
    },
    marzbanToken: { type: String, required: true },
    marzbanTokenExpiresAt: { type: Date, required: true },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);
