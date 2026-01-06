import type AccountType from "@/models/AccountType";
import apiClient from "@/utils/apiClient";

import { getBackendUrl } from "./backend";

export const fetchAccounts = async (params: {
  backendUrl: string | undefined;
  sellerUsername: string;
  showAll: boolean;
  signal?: AbortSignal;
}): Promise<AccountType[]> => {
  const { backendUrl, sellerUsername, showAll, signal } = params;
  const url = getBackendUrl(
    backendUrl,
    `api/marzban/accounts/${encodeURIComponent(sellerUsername)}/${encodeURIComponent(
      String(showAll),
    )}`,
  );
  const requestConfig = signal ? { signal } : undefined;
  const result = await apiClient.get<AccountType[]>(url, requestConfig);
  return Array.isArray(result.data) ? result.data : [];
};

export const disableAccount = async (params: {
  backendUrl: string | undefined;
  accountUsername: string;
  nextStatus: string;
}): Promise<void> => {
  const { backendUrl, accountUsername, nextStatus } = params;
  const url = getBackendUrl(
    backendUrl,
    `api/marzban/disableaccount/${encodeURIComponent(accountUsername)}`,
  );
  await apiClient.post(url, { status: nextStatus });
};

export const revokeSubscription = async (params: {
  backendUrl: string | undefined;
  accountUsername: string;
}): Promise<void> => {
  const { backendUrl, accountUsername } = params;
  const url = getBackendUrl(
    backendUrl,
    `api/marzban/revokesub/${encodeURIComponent(accountUsername)}`,
  );
  await apiClient.post(url, {});
};

export const updatePayment = async (params: {
  backendUrl: string | undefined;
  accountId: string;
  nextPayed: boolean;
}): Promise<void> => {
  const { backendUrl, accountId, nextPayed } = params;
  const url = getBackendUrl(backendUrl, `api/payaccount/${encodeURIComponent(accountId)}`);
  await apiClient.post(url, { payed: nextPayed });
};

export const payAccounts = async (params: {
  backendUrl: string | undefined;
  accountIds: string[];
}): Promise<void> => {
  const { backendUrl, accountIds } = params;
  const url = getBackendUrl(backendUrl, "api/payaccounts/");
  await apiClient.post(url, { accountIds, payed: true });
};

export const addAccount = async (params: {
  backendUrl: string | undefined;
  sellerUsername: string;
  note: string;
  tariffId: string;
  onHold: boolean;
}): Promise<AccountType> => {
  const { backendUrl, sellerUsername, note, tariffId, onHold } = params;
  const url = getBackendUrl(backendUrl, "api/marzban/account");
  const response = await apiClient.post<AccountType>(url, {
    username: sellerUsername,
    note,
    tariffId,
    onhold: onHold,
  });
  return response.data;
};

export const deleteAccount = async (params: {
  backendUrl: string | undefined;
  accountUsername: string;
}): Promise<void> => {
  const { backendUrl, accountUsername } = params;
  const url = getBackendUrl(
    backendUrl,
    `api/marzban/account/${encodeURIComponent(accountUsername)}`,
  );
  await apiClient.delete(url);
};

export const renewAccount = async (params: {
  backendUrl: string | undefined;
  sellerUsername: string;
  accountUsername: string;
  tariffId: string;
}): Promise<void> => {
  const { backendUrl, sellerUsername, accountUsername, tariffId } = params;
  const url = getBackendUrl(
    backendUrl,
    `api/marzban/renewaccount/${encodeURIComponent(sellerUsername)}`,
  );
  await apiClient.post(url, {
    username: accountUsername,
    tariffId,
  });
};
