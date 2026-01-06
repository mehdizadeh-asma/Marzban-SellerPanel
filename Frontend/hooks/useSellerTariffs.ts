import { useCallback, useMemo } from "react";

import type { AlertColor } from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useMyContext } from "@/context/MyContext";
import type TariffType from "@/models/TariffType";
import { INVALID_BACKEND_URL_MESSAGE, isInvalidBackendUrlError } from "@/services/backend";
import { fetchSellerTariffs } from "@/services/tariffs";

type NotifyFn = (severity: AlertColor, text: string) => void;

type UseSellerTariffsResult = {
  tariffs: TariffType[];
  isFetching: boolean;
};

export const useSellerTariffs = (onMessage?: NotifyFn): UseSellerTariffsResult => {
  const { user, config } = useMyContext();

  const notify = useCallback<NotifyFn>(
    (severity, text) => {
      onMessage?.(severity, text);
    },
    [onMessage],
  );

  const tariffsQuery = useQuery({
    queryKey: ["tariffs", "seller", user.Username],
    enabled: Boolean(user.accessToken && user.Username && config.BACKEND_URL),
    queryFn: async ({ signal }) => {
      try {
        return await fetchSellerTariffs({
          backendUrl: config.BACKEND_URL,
          sellerUsername: user.Username,
          signal,
        });
      } catch (error) {
        if (isInvalidBackendUrlError(error)) {
          notify("error", INVALID_BACKEND_URL_MESSAGE);
          return [];
        }
        throw error;
      }
    },
    placeholderData: keepPreviousData,
  });

  const tariffs = useMemo(() => tariffsQuery.data ?? [], [tariffsQuery.data]);

  return {
    tariffs,
    isFetching: tariffsQuery.isFetching,
  };
};
