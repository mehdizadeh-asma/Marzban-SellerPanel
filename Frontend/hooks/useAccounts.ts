import { useCallback, useMemo } from "react";

import type { AlertColor } from "@mui/material";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { useMyContext } from "@/context/MyContext";
import type AccountType from "@/models/AccountType";
import type TariffType from "@/models/TariffType";
import {
  addAccount,
  deleteAccount,
  disableAccount,
  fetchAccounts,
  payAccounts,
  renewAccount,
  revokeSubscription,
  updatePayment,
} from "@/services/accounts";
import { INVALID_BACKEND_URL_MESSAGE, isInvalidBackendUrlError } from "@/services/backend";

const toGb = (bytes: number): number => bytes / (1024 * 1024 * 1024);

type NotifyFn = (severity: AlertColor, text: string) => void;

type AccountsSnapshot = [QueryKey, AccountType[] | undefined][];

type UseAccountsResult = {
  accounts: AccountType[];
  unpaidUsernames: Set<string>;
  loading: boolean;
  isFetching: boolean;
  addAccount: (tariff: TariffType, note: string, onHold: boolean) => void;
  deleteAccount: (account: AccountType) => void;
  renewAccount: (username: string, tariff: TariffType) => void;
  disableAccount: (variables: { account: AccountType; nextStatus: string }) => void;
  revokeSubscription: (account: AccountType) => void;
  togglePayment: (accountId: string) => void;
  payAll: (accountIds: string[]) => void;
};

export const useAccounts = (params: {
  showAll: boolean;
  onMessage?: NotifyFn;
}): UseAccountsResult => {
  const { showAll, onMessage } = params;
  const { user, config, setUser } = useMyContext();
  const queryClient = useQueryClient();

  const notify = useCallback<NotifyFn>(
    (severity, text) => {
      onMessage?.(severity, text);
    },
    [onMessage],
  );

  const handleInvalidBackendUrl = useCallback(
    (error: unknown): boolean => {
      if (isInvalidBackendUrlError(error)) {
        notify("error", INVALID_BACKEND_URL_MESSAGE);
        return true;
      }
      return false;
    },
    [notify],
  );

  const accountsQueryKey = useMemo(
    () => ["accounts", user.Username, showAll] as const,
    [showAll, user.Username],
  );

  const accountsQuery = useQuery({
    queryKey: accountsQueryKey,
    enabled: Boolean(user.accessToken && user.Username && config.BACKEND_URL),
    queryFn: async ({ signal }) => {
      try {
        return await fetchAccounts({
          backendUrl: config.BACKEND_URL,
          sellerUsername: user.Username,
          showAll,
          signal,
        });
      } catch (error) {
        if (handleInvalidBackendUrl(error)) {
          return [];
        }
        throw error;
      }
    },
    placeholderData: keepPreviousData,
  });

  const accountList = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);

  const unpaidUsernames = useMemo(() => {
    const set = new Set<string>();
    for (const account of accountList) {
      if (account.payed === "Unpaid") {
        set.add(account.username);
      }
    }
    return set;
  }, [accountList]);

  const accountById = useMemo(() => {
    const map = new Map<string, AccountType>();
    for (const account of accountList) {
      map.set(account.id, account);
    }
    return map;
  }, [accountList]);

  const snapshotAccountsCache = useCallback(
    (): AccountsSnapshot =>
      queryClient.getQueriesData<AccountType[]>({ queryKey: ["accounts", user.Username] }),
    [queryClient, user.Username],
  );

  const restoreAccountsCache = useCallback(
    (snapshot: AccountsSnapshot): void => {
      snapshot.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    [queryClient],
  );

  const updateAccountsCache = useCallback(
    (updater: (list: AccountType[]) => AccountType[]) => {
      queryClient.setQueriesData<AccountType[]>(
        { queryKey: ["accounts", user.Username] },
        (data) => (data ? updater(data) : data),
      );
    },
    [queryClient, user.Username],
  );

  const disableAccountMutation = useMutation({
    mutationKey: ["accounts", user.Username, "disable"],
    mutationFn: async (variables: { account: AccountType; nextStatus: string }) =>
      disableAccount({
        backendUrl: config.BACKEND_URL,
        accountUsername: variables.account.username,
        nextStatus: variables.nextStatus,
      }),
    onMutate: ({ account, nextStatus }) => {
      const snapshot = snapshotAccountsCache();
      updateAccountsCache((list) =>
        list.map((item) =>
          item.username === account.username ? { ...item, status: nextStatus } : item,
        ),
      );
      return { snapshot };
    },
    onError: (error, _variables, context) => {
      if (context?.snapshot) {
        restoreAccountsCache(context.snapshot);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
    },
  });

  const revokeSubscriptionMutation = useMutation({
    mutationKey: ["accounts", user.Username, "revoke"],
    mutationFn: async (account: AccountType) =>
      revokeSubscription({
        backendUrl: config.BACKEND_URL,
        accountUsername: account.username,
      }),
    onSuccess: () => {
      notify("success", "Subscription Revoked Successfully!");
    },
    onError: (error) => {
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      notify("error", `Something went Wrong! ${String(error)}`);
    },
  });

  const paymentMutation = useMutation({
    mutationKey: ["accounts", user.Username, "payment"],
    mutationFn: async (variables: { accountId: string; nextPayed: boolean }) =>
      updatePayment({
        backendUrl: config.BACKEND_URL,
        accountId: variables.accountId,
        nextPayed: variables.nextPayed,
      }),
    onMutate: ({ accountId, nextPayed }) => {
      const snapshot = snapshotAccountsCache();
      updateAccountsCache((list) =>
        list.map((item) =>
          item.id === accountId
            ? {
                ...item,
                payed: nextPayed ? "Paid" : "Unpaid",
              }
            : item,
        ),
      );
      return { snapshot };
    },
    onSuccess: () => {
      notify("success", "Payment updated successfully!");
    },
    onError: (error, _variables, context) => {
      if (context?.snapshot) {
        restoreAccountsCache(context.snapshot);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
    },
  });

  const payAllMutation = useMutation({
    mutationKey: ["accounts", user.Username, "payAll"],
    mutationFn: async (accountIds: string[]) =>
      payAccounts({ backendUrl: config.BACKEND_URL, accountIds }),
    onMutate: (accountIds) => {
      const snapshot = snapshotAccountsCache();
      updateAccountsCache((list) =>
        list.map((item) => (accountIds.includes(item.id) ? { ...item, payed: "Paid" } : item)),
      );
      return { snapshot };
    },
    onSuccess: () => {
      notify("success", "Payments updated successfully!");
    },
    onError: (error, _variables, context) => {
      if (context?.snapshot) {
        restoreAccountsCache(context.snapshot);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
    },
  });

  const addAccountMutation = useMutation({
    mutationKey: ["accounts", user.Username, "add"],
    mutationFn: async (variables: { tariff: TariffType; note: string; onHold: boolean }) =>
      addAccount({
        backendUrl: config.BACKEND_URL,
        sellerUsername: user.Username,
        note: variables.note,
        tariffId: variables.tariff._id ?? "",
        onHold: variables.onHold,
      }),
    onSuccess: (data, variables) => {
      setUser((prev) => {
        if (variables.tariff.IsFree) {
          return prev;
        }
        return {
          ...prev,
          Limit: prev.Limit - variables.tariff.DataLimit,
          TotalPrice: prev.TotalPrice + variables.tariff.Price,
        };
      });
      notify("success", "Account Added Successful!");
      if (data && typeof data === "object" && "id" in data) {
        updateAccountsCache((list) => [...list, data]);
      } else {
        void queryClient.invalidateQueries({ queryKey: ["accounts", user.Username] });
      }
    },
    onError: (error) => {
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationKey: ["accounts", user.Username, "delete"],
    mutationFn: async (account: AccountType) => {
      await deleteAccount({
        backendUrl: config.BACKEND_URL,
        accountUsername: account.username,
      });
      return account;
    },
    onMutate: (account) => {
      const snapshot = snapshotAccountsCache();
      updateAccountsCache((list) => list.filter((item) => item.username !== account.username));
      return { snapshot };
    },
    onSuccess: (account) => {
      const dataLimitGb = toGb(account.data_limit);
      setUser((prev) => ({
        ...prev,
        Limit: prev.Limit + dataLimitGb,
        TotalPrice: prev.TotalPrice - account.price,
      }));
    },
    onError: (error, _variables, context) => {
      if (context?.snapshot) {
        restoreAccountsCache(context.snapshot);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
    },
  });

  const renewAccountMutation = useMutation({
    mutationKey: ["accounts", user.Username, "renew"],
    mutationFn: async (variables: { accountUsername: string; tariff: TariffType }) =>
      renewAccount({
        backendUrl: config.BACKEND_URL,
        sellerUsername: user.Username,
        accountUsername: variables.accountUsername,
        tariffId: variables.tariff._id ?? "",
      }),
    onSuccess: (_data, variables) => {
      const selectedTariff = variables.tariff;
      if (!selectedTariff.IsFree) {
        setUser((prev) => ({
          ...prev,
          Limit: prev.Limit - selectedTariff.DataLimit,
          TotalPrice: prev.TotalPrice + selectedTariff.Price,
        }));
      }
      void queryClient.invalidateQueries({ queryKey: ["accounts", user.Username] });
    },
    onError: (error) => {
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
    },
  });

  const addAccountAction = useCallback(
    (tariff: TariffType, note: string, onHold: boolean): void => {
      if (!tariff._id) {
        notify("error", "Tariff ID is missing.");
        return;
      }
      if (user.Limit >= tariff.DataLimit) {
        addAccountMutation.mutate({ tariff, note, onHold });
      } else {
        notify("error", "You are Limited!");
      }
    },
    [addAccountMutation, notify, user.Limit],
  );

  const togglePayment = useCallback(
    (accountId: string): void => {
      if (!user.IsAdmin) return;
      const account = accountById.get(accountId);
      if (!account) {
        notify("error", "Account not found.");
        return;
      }
      const nextPayed = account.payed !== "Paid";
      paymentMutation.mutate({ accountId, nextPayed });
    },
    [accountById, notify, paymentMutation, user.IsAdmin],
  );

  const payAll = useCallback(
    (accountIds: string[]): void => {
      if (!user.IsAdmin || accountIds.length === 0) return;
      payAllMutation.mutate(accountIds);
    },
    [payAllMutation, user.IsAdmin],
  );

  const renewAccountAction = useCallback(
    (accountUsername: string, tariff: TariffType): void => {
      if (!tariff._id) {
        notify("error", "Tariff ID is missing.");
        return;
      }
      if (user.Limit >= tariff.DataLimit) {
        renewAccountMutation.mutate({ accountUsername, tariff });
      } else {
        notify("error", "You are Limited!");
      }
    },
    [notify, renewAccountMutation, user.Limit],
  );

  const loading =
    accountsQuery.isFetching ||
    disableAccountMutation.isPending ||
    revokeSubscriptionMutation.isPending ||
    paymentMutation.isPending ||
    payAllMutation.isPending ||
    addAccountMutation.isPending ||
    deleteAccountMutation.isPending ||
    renewAccountMutation.isPending;

  return {
    accounts: accountList,
    unpaidUsernames,
    loading,
    isFetching: accountsQuery.isFetching,
    addAccount: addAccountAction,
    deleteAccount: deleteAccountMutation.mutate,
    renewAccount: renewAccountAction,
    disableAccount: disableAccountMutation.mutate,
    revokeSubscription: revokeSubscriptionMutation.mutate,
    togglePayment,
    payAll,
  };
};
