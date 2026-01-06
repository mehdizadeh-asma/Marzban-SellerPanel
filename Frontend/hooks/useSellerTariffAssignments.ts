import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { AlertColor } from "@mui/material";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useMyContext } from "@/context/MyContext";
import type TariffSellerAssignmentType from "@/models/TariffSellerAssignmentType";
import { INVALID_BACKEND_URL_MESSAGE, isInvalidBackendUrlError } from "@/services/backend";
import { fetchSellerTariffAssignments } from "@/services/tariffSellers";

type NotifyFn = (severity: AlertColor, text: string) => void;

type UseSellerTariffAssignmentsResult = {
  assignments: TariffSellerAssignmentType[];
  setAssignments: Dispatch<SetStateAction<TariffSellerAssignmentType[]>>;
  selectedTariffIds: string[];
  isFetching: boolean;
};

export const useSellerTariffAssignments = (
  sellerId?: string,
  onMessage?: NotifyFn,
): UseSellerTariffAssignmentsResult => {
  const { user, config } = useMyContext();
  const [assignments, setAssignments] = useState<TariffSellerAssignmentType[]>([]);

  const notify = useCallback<NotifyFn>(
    (severity, text) => {
      onMessage?.(severity, text);
    },
    [onMessage],
  );

  const assignmentsQuery = useQuery({
    queryKey: ["sellerTariffs", sellerId],
    enabled: Boolean(user.accessToken && sellerId && config.BACKEND_URL),
    queryFn: async ({ signal }) => {
      try {
        return await fetchSellerTariffAssignments({
          backendUrl: config.BACKEND_URL,
          sellerId: sellerId ?? "",
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

  useEffect(() => {
    setAssignments(assignmentsQuery.data ?? []);
  }, [assignmentsQuery.data]);

  const selectedTariffIds = useMemo(() => {
    const ids: string[] = [];
    for (const item of assignments) {
      if (item.SellerId !== "") {
        ids.push(item.TariffId);
      }
    }
    return ids;
  }, [assignments]);

  return {
    assignments,
    setAssignments,
    selectedTariffIds,
    isFetching: assignmentsQuery.isFetching,
  };
};
