export default interface TariffType {
  _id?: string;
  Title: string;
  DataLimit: number;
  Duration: number;
  Price: number;
  IsFree: boolean;
  IsVisible: boolean;
}
