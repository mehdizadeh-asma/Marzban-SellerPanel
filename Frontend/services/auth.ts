import axios, { type AxiosResponse } from "axios";

import { getBackendUrl } from "./backend";

export const loginToMarzban = async (params: {
  backendUrl: string | undefined;
  username: string;
  password: string;
}): Promise<AxiosResponse<unknown>> => {
  const { backendUrl, username, password } = params;
  const url = getBackendUrl(backendUrl, "api/marzban/logintomarzban");
  return axios.post(url, {
    username,
    password,
  });
};
