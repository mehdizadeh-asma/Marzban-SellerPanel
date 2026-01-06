import { useCallback, useMemo } from "react";

import type { AlertColor } from "@mui/material";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useMyContext } from "@/context/MyContext";
import type TariffType from "@/models/TariffType";
import { INVALID_BACKEND_URL_MESSAGE, isInvalidBackendUrlError } from "@/services/backend";
import {
  addTariff as addTariffRequest,
  fetchAdminTariffs,
  toggleTariffFree,
  toggleTariffVisibility,
} from "@/services/tariffs";

const missingTariffIdMessage = "Tariff ID is missing.";

type NotifyFn = (severity: AlertColor, text: string) => void;

type UseTariffsResult = {
  tariffs: TariffType[];
  loading: boolean;
  addTariff: (tariff: TariffType) => void;
  toggleVisibility: (tariff: TariffType) => void;
  toggleFree: (tariff: TariffType) => void;
};

export const useTariffs = (params: { onMessage?: NotifyFn }): UseTariffsResult => {
  const { onMessage } = params;
  const { user, config } = useMyContext();
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

  const tariffsQuery = useQuery({
    queryKey: ["tariffs", "admin"],
    enabled: Boolean(user.accessToken && config.BACKEND_URL),
    queryFn: async ({ signal }) => {
      try {
        return await fetchAdminTariffs({ backendUrl: config.BACKEND_URL, signal });
      } catch (error) {
        if (handleInvalidBackendUrl(error)) {
          return [];
        }
        throw error;
      }
    },
    placeholderData: keepPreviousData,
  });

  const updateTariffsCache = useCallback(
    (updater: (list: TariffType[]) => TariffType[]) => {
      queryClient.setQueryData<TariffType[]>(["tariffs", "admin"], (current) => {
        if (!current) return current;
        return updater(current);
      });
    },
    [queryClient],
  );

  const addTariffMutation = useMutation({
    mutationKey: ["tariffs", "admin", "add"],
    mutationFn: async (tariff: TariffType) =>
      addTariffRequest({ backendUrl: config.BACKEND_URL, tariff }),
    onSuccess: (data) => {
      updateTariffsCache((list) => [...list, data]);
      notify("success", "Package Insert Successful!");
    },
    onError: (error) => {
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
    },
  });

  const disableTariffMutation = useMutation({
    mutationKey: ["tariffs", "admin", "disable"],
    mutationFn: async (tariff: TariffType) => {
      const tariffId = tariff._id;
      if (!tariffId) {
        throw new Error("MISSING_TARIFF_ID");
      }
      await toggleTariffVisibility({ backendUrl: config.BACKEND_URL, tariffId });
    },
    onMutate: async (tariff) => {
      await queryClient.cancelQueries({ queryKey: ["tariffs", "admin"] });
      const previous = queryClient.getQueryData<TariffType[]>(["tariffs", "admin"]);
      updateTariffsCache((list) =>
        list.map((item) =>
          item._id === tariff._id ? { ...item, IsVisible: !item.IsVisible } : item,
        ),
      );
      return { previous };
    },
    onError: (error, _tariff, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tariffs", "admin"], context.previous);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      if (error instanceof Error && error.message === "MISSING_TARIFF_ID") {
        notify("error", missingTariffIdMessage);
        return;
      }
      console.log(error);
    },
    onSuccess: () => {
      notify("success", "Package Change Successful!");
    },
  });

  const freeChangedMutation = useMutation({
    mutationKey: ["tariffs", "admin", "free"],
    mutationFn: async (tariff: TariffType) => {
      const tariffId = tariff._id;
      if (!tariffId) {
        throw new Error("MISSING_TARIFF_ID");
      }
      await toggleTariffFree({ backendUrl: config.BACKEND_URL, tariffId });
    },
    onMutate: async (tariff) => {
      await queryClient.cancelQueries({ queryKey: ["tariffs", "admin"] });
      const previous = queryClient.getQueryData<TariffType[]>(["tariffs", "admin"]);
      updateTariffsCache((list) =>
        list.map((item) => (item._id === tariff._id ? { ...item, IsFree: !item.IsFree } : item)),
      );
      return { previous };
    },
    onError: (error, _tariff, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tariffs", "admin"], context.previous);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      if (error instanceof Error && error.message === "MISSING_TARIFF_ID") {
        notify("error", missingTariffIdMessage);
        return;
      }
      console.log(error);
    },
    onSuccess: () => {
      notify("success", "Package Change Successful!");
    },
  });

  const tariffs = useMemo(() => tariffsQuery.data ?? [], [tariffsQuery.data]);

  const loading =
    tariffsQuery.isFetching ||
    addTariffMutation.isPending ||
    disableTariffMutation.isPending ||
    freeChangedMutation.isPending;

  return {
    tariffs,
    loading,
    addTariff: addTariffMutation.mutate,
    toggleVisibility: disableTariffMutation.mutate,
    toggleFree: freeChangedMutation.mutate,
  };
};
