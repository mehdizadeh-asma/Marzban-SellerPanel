import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useMyContext } from "@/context/MyContext";
import type TariffInboundType from "@/models/TariffInboundType";
import { INVALID_BACKEND_URL_MESSAGE, isInvalidBackendUrlError } from "@/services/backend";
import {
  fetchTariffInbounds,
  saveTariffInbounds,
  type TariffInboundPayloadItem,
} from "@/services/tariffInbounds";

export const useTariffInbounds = (params: {
  tariffId: string;
  isOpen: boolean;
  onMessage: (messageType: string, message: string) => void;
  onSaved?: () => void;
}): {
  tariffInbounds: TariffInboundType[];
  setTariffInbounds: Dispatch<SetStateAction<TariffInboundType[]>>;
  assignedTariffInbounds: TariffInboundType[];
  isFetching: boolean;
  saveAssignments: () => void;
  isSaving: boolean;
} => {
  const { tariffId, isOpen, onMessage, onSaved } = params;
  const { user, config } = useMyContext();
  const queryClient = useQueryClient();
  const [tariffInbounds, setTariffInbounds] = useState<TariffInboundType[]>([]);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const tariffInboundQuery = useQuery({
    queryKey: ["tariffInbounds", tariffId],
    enabled: Boolean(isOpen && user.accessToken && tariffId && config.BACKEND_URL),
    queryFn: async ({ signal }) => {
      try {
        return await fetchTariffInbounds({
          backendUrl: config.BACKEND_URL,
          tariffId,
          signal,
        });
      } catch (error) {
        if (isInvalidBackendUrlError(error)) {
          onMessageRef.current("error", INVALID_BACKEND_URL_MESSAGE);
          return [];
        }
        throw error;
      }
    },
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!isOpen) return;
    setTariffInbounds(tariffInboundQuery.data ?? []);
  }, [isOpen, tariffInboundQuery.data]);

  const assignedTariffInbounds = useMemo(
    () => tariffInbounds.filter((item) => item.TariffId !== ""),
    [tariffInbounds],
  );

  const saveMutation = useMutation({
    mutationFn: async (payload: TariffInboundPayloadItem[]) =>
      saveTariffInbounds({
        backendUrl: config.BACKEND_URL,
        tariffId,
        payload,
      }),
    onSuccess: () => {
      queryClient.setQueryData(["tariffInbounds", tariffId], tariffInbounds);
      onMessageRef.current("success", "Inbounds Assigned to Package Successfully!");
      onSaved?.();
    },
    onError: (error) => {
      const message = isInvalidBackendUrlError(error)
        ? INVALID_BACKEND_URL_MESSAGE
        : `An error occurred while assigning inbounds to the package: ${String(error)}`;
      onMessageRef.current("error", message);
    },
  });

  const saveAssignments = useCallback(() => {
    const payload = assignedTariffInbounds.map((item) => ({
      InboundTag: item.InboundTag,
      InboundType: item.InboundType,
    }));
    saveMutation.mutate(payload);
  }, [assignedTariffInbounds, saveMutation]);

  return {
    tariffInbounds,
    setTariffInbounds,
    assignedTariffInbounds,
    isFetching: tariffInboundQuery.isFetching,
    saveAssignments,
    isSaving: saveMutation.isPending,
  };
};
