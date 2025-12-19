export default interface AccountType {
  id: string;
  username: string;
  note: string;
  package: string;
  price: number;
  subscription_url: string;
  online: string;
  online_at: string;
  payed: string;
  data_limit: number;
  data_limit_string: string;
  used_traffic: number;
  used_traffic_string: string;
  expire: number;
  expire_string: string;
  status: string;
  sub_updated_at: string;
  sub_last_user_agent: string;
}
