import { useCallback, useMemo } from "react";

import type { AlertColor } from "@mui/material";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import axios from "axios";

import { useMyContext } from "@/context/MyContext";
import type SellerType from "@/models/SellerType";
import { INVALID_BACKEND_URL_MESSAGE, isInvalidBackendUrlError } from "@/services/backend";
import {
  addSeller as addSellerRequest,
  assignSellerPackages,
  deleteSeller as deleteSellerRequest,
  fetchSellers,
  toggleSellerStatus,
  updateSeller as updateSellerRequest,
} from "@/services/sellers";

const missingSellerIdMessage = "Seller ID is missing.";

type NotifyFn = (severity: AlertColor, text: string) => void;

type UseSellersResult = {
  sellers: SellerType[];
  loading: boolean;
  addSeller: (seller: SellerType) => void;
  updateSeller: (seller: SellerType) => void;
  deleteSeller: (seller: SellerType) => void;
  disableSeller: (seller: SellerType) => void;
  assignPackages: (seller: SellerType, packagesListIds: string[]) => void;
};

export const useSellers = (params: {
  onMessage?: NotifyFn;
  onAddSuccess?: () => void;
  onUpdateSettled?: () => void;
}): UseSellersResult => {
  const { onMessage, onAddSuccess, onUpdateSettled } = params;
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

  const sellersQuery = useQuery({
    queryKey: ["sellers"],
    enabled: Boolean(user.accessToken && config.BACKEND_URL),
    queryFn: async ({ signal }) => {
      try {
        return await fetchSellers({ backendUrl: config.BACKEND_URL, signal });
      } catch (error) {
        if (handleInvalidBackendUrl(error)) {
          return [];
        }
        throw error;
      }
    },
    placeholderData: keepPreviousData,
  });

  const updateSellersCache = useCallback(
    (updater: (list: SellerType[]) => SellerType[]) => {
      queryClient.setQueryData<SellerType[]>(["sellers"], (current) => {
        if (!current) return current;
        return updater(current);
      });
    },
    [queryClient],
  );

  const deleteSellerMutation = useMutation({
    mutationKey: ["sellers", "delete"],
    mutationFn: async (sellerId: string) =>
      deleteSellerRequest({ backendUrl: config.BACKEND_URL, sellerId }),
    onMutate: async (sellerId) => {
      await queryClient.cancelQueries({ queryKey: ["sellers"] });
      const previous = queryClient.getQueryData<SellerType[]>(["sellers"]);
      updateSellersCache((list) => list.filter((seller) => seller._id !== sellerId));
      return { previous };
    },
    onError: (error, _sellerId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["sellers"], context.previous);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
    },
    onSuccess: () => {
      notify("success", "Agent Delete Successful!");
    },
  });

  const updateSellerMutation = useMutation({
    mutationKey: ["sellers", "update"],
    mutationFn: async (seller: SellerType) => {
      const sellerId = seller._id;
      if (!sellerId) {
        throw new Error("MISSING_SELLER_ID");
      }
      return updateSellerRequest({ backendUrl: config.BACKEND_URL, sellerId, seller });
    },
    onMutate: async (seller) => {
      await queryClient.cancelQueries({ queryKey: ["sellers"] });
      const previous = queryClient.getQueryData<SellerType[]>(["sellers"]);
      updateSellersCache((list) => list.map((item) => (item._id === seller._id ? seller : item)));
      return { previous };
    },
    onError: (error, _seller, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["sellers"], context.previous);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      if (error instanceof Error && error.message === "MISSING_SELLER_ID") {
        notify("error", missingSellerIdMessage);
        return;
      }
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const statusCode = axiosError.response?.status;
        if (statusCode === 404) {
          notify("error", "Invalid Marzban Account Information");
          return;
        }
        if (!axiosError.response) {
          notify("error", "No response from the server.");
          return;
        }
        const responseData = axiosError.response.data;
        const responseRecord =
          typeof responseData === "object" && responseData !== null
            ? (responseData as Record<string, unknown>)
            : null;
        const errorMessage =
          (responseRecord?.message as string | undefined) ||
          (responseRecord?.error as string | undefined) ||
          "Update Failed, An error occurred";
        notify("error", errorMessage);
        return;
      }
      notify("error", "An unknown error occurred.");
    },
    onSuccess: () => {
      notify("success", "Agent Updated Successfully!");
    },
    onSettled: () => {
      onUpdateSettled?.();
    },
  });

  const addSellerMutation = useMutation({
    mutationKey: ["sellers", "add"],
    mutationFn: async (seller: SellerType) =>
      addSellerRequest({ backendUrl: config.BACKEND_URL, seller }),
    onSuccess: (data) => {
      updateSellersCache((list) => [...list, data]);
      notify("success", "Agent Inserted Successfully!");
      onAddSuccess?.();
    },
    onError: (error) => {
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response) {
          const statusCode = axiosError.response.status;

          if (statusCode === 404) {
            notify("error", "Invalid Marzban Account Information");
          } else {
            notify("error", "Internal Server Error! Please try again later.");
          }
        } else {
          notify("error", "No response from the server.");
        }
      } else {
        notify("error", "An unknown error occurred.");
      }
    },
  });

  const disableSellerMutation = useMutation({
    mutationKey: ["sellers", "disable"],
    mutationFn: async (seller: SellerType) => {
      const sellerId = seller._id;
      if (!sellerId) {
        throw new Error("MISSING_SELLER_ID");
      }
      await toggleSellerStatus({ backendUrl: config.BACKEND_URL, sellerId });
    },
    onMutate: async (seller) => {
      await queryClient.cancelQueries({ queryKey: ["sellers"] });
      const previous = queryClient.getQueryData<SellerType[]>(["sellers"]);
      updateSellersCache((list) =>
        list.map((item) =>
          item._id === seller._id
            ? {
                ...item,
                Status: item.Status === "Active" ? "Inactive" : "Active",
              }
            : item,
        ),
      );
      return { previous };
    },
    onError: (error, _seller, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["sellers"], context.previous);
      }
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      if (error instanceof Error && error.message === "MISSING_SELLER_ID") {
        notify("error", missingSellerIdMessage);
        return;
      }
      console.log(error);
    },
    onSuccess: () => {
      notify("success", "Agent Change Successful!");
    },
  });

  const assignPackagesMutation = useMutation({
    mutationKey: ["sellers", "assign"],
    mutationFn: async (variables: { sellerId: string; packagesListIds: string[] }) =>
      assignSellerPackages({
        backendUrl: config.BACKEND_URL,
        sellerId: variables.sellerId,
        packagesListIds: variables.packagesListIds,
      }),
    onSuccess: () => {
      notify("success", "Packages Assigned to Seller Successfully!");
    },
    onError: (error) => {
      if (handleInvalidBackendUrl(error)) {
        return;
      }
      console.log(error);
      notify("error", "An error occurred while assigning packages to the seller ");
    },
  });

  const sellers = useMemo(() => sellersQuery.data ?? [], [sellersQuery.data]);

  const deleteSeller = useCallback(
    (seller: SellerType): void => {
      const sellerId = seller._id;
      if (!sellerId) {
        notify("error", missingSellerIdMessage);
        return;
      }
      deleteSellerMutation.mutate(sellerId);
    },
    [deleteSellerMutation, notify],
  );

  const updateSeller = useCallback(
    (seller: SellerType): void => {
      if (!seller._id) {
        notify("error", missingSellerIdMessage);
        return;
      }
      updateSellerMutation.mutate(seller);
    },
    [notify, updateSellerMutation],
  );

  const disableSeller = useCallback(
    (seller: SellerType): void => {
      if (!seller._id) {
        notify("error", missingSellerIdMessage);
        return;
      }
      disableSellerMutation.mutate(seller);
    },
    [disableSellerMutation, notify],
  );

  const assignPackages = useCallback(
    (seller: SellerType, packagesListIds: string[]): void => {
      const sellerId = seller._id;
      if (!sellerId) {
        notify("error", missingSellerIdMessage);
        return;
      }
      assignPackagesMutation.mutate({ sellerId, packagesListIds });
    },
    [assignPackagesMutation, notify],
  );

  const loading =
    sellersQuery.isFetching ||
    deleteSellerMutation.isPending ||
    updateSellerMutation.isPending ||
    addSellerMutation.isPending ||
    disableSellerMutation.isPending ||
    assignPackagesMutation.isPending;

  return {
    sellers,
    loading,
    addSeller: addSellerMutation.mutate,
    updateSeller,
    deleteSeller,
    disableSeller,
    assignPackages,
  };
};
