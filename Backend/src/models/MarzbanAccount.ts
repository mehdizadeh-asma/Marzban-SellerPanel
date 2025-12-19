interface MarzbanAccount {
  username: string;
  data_limit: number;
  used_traffic: number;
  expire: number;
  status: string;
  subscription_url: string;
  online_at: string;
  sub_updated_at: string;
  sub_last_user_agent: string;
  note: string;
}

export default MarzbanAccount;
