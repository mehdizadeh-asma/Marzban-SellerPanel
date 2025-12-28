import type { HydratedDocument, Types } from "mongoose";
import { Schema } from "mongoose";

export interface ITariff {
  _id: Types.ObjectId;
  Title: string;
  DataLimit: number;
  Duration: number;
  Price: number;
  IsFree: boolean;
  IsVisible: boolean;
}

export type TariffDocument = HydratedDocument<ITariff>;

export const TariffSchema = new Schema<ITariff>({
  Title: { type: String, required: [true, "Title is required"] },
  DataLimit: { type: Number, required: [true, "DataLimit is required"] },
  Duration: { type: Number, required: [true, "Duration is required"] },
  Price: { type: Number, required: [true, "Price is required"] },
  IsFree: { type: Boolean, default: false },
  IsVisible: { type: Boolean, default: true },
});
