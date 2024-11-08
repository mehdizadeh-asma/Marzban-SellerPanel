import mongoose, { Document, Schema } from "mongoose";

export interface ITariff extends Document {
  Title: string;
  DataLimit: number;
  Duration: number;
  Price: number;
  IsFree: boolean;
  IsVisible: boolean;
}

export const TariffSchema: Schema = new Schema({
  Title: { type: String, required: [true, "Title is required"] },
  DataLimit: { type: Number, required: [true, "DataLimit is required"] },
  Duration: { type: Number, required: [true, "Duration is required"] },
  Price: { type: Number, required: [true, "Price is required"] },
  IsFree: { type: Boolean, default: false },
  IsVisible: { type: Boolean, default: true },
});

const Tariff = mongoose.model<ITariff>("Tariff", TariffSchema);
export default Tariff;
