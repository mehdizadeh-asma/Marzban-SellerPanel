export type AccountOnlineStatus = "Online" | "Offline" | "Never" | (string & {});
export type AccountPaymentStatus = "Paid" | "Unpaid" | (string & {});
export type AccountStatus =
  | "active"
  | "on_hold"
  | "disabled"
  | "expired"
  | "limited"
  | (string & {});

export default interface AccountType {
  id: string;
  username: string;
  note: string;
  package: string;
  price: number;
  subscription_url: string;
  online: AccountOnlineStatus;
  online_at: string;
  payed: AccountPaymentStatus;
  data_limit: number;
  data_limit_string: string;
  used_traffic: number;
  used_traffic_string: string;
  expire: number;
  expire_string: string;
  status: AccountStatus;
  sub_updated_at: string;
  sub_last_user_agent: string;
}
