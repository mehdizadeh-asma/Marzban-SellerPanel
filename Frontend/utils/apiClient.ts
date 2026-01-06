import axios from "axios";

const normalizeToken = (token: string): string => token.trim().replace(/^Bearer\s+/i, "");

const apiClient = axios.create();

export const setApiAccessToken = (accessToken: string): void => {
  const normalizedToken = normalizeToken(accessToken);
  if (normalizedToken) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${normalizedToken}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

export default apiClient;
