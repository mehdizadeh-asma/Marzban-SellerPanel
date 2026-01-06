import type SellerType from "@/models/SellerType";
import apiClient from "@/utils/apiClient";

import { getBackendUrl } from "./backend";

export const fetchSellers = async (params: {
  backendUrl: string | undefined;
  signal?: AbortSignal;
}): Promise<SellerType[]> => {
  const { backendUrl, signal } = params;
  const url = getBackendUrl(backendUrl, "api/sellers");
  const requestConfig = signal ? { signal } : undefined;
  const result = await apiClient.get<SellerType[]>(url, requestConfig);
  return Array.isArray(result.data) ? result.data : [];
};

export const addSeller = async (params: {
  backendUrl: string | undefined;
  seller: SellerType;
}): Promise<SellerType> => {
  const { backendUrl, seller } = params;
  const url = getBackendUrl(backendUrl, "api/seller");
  const response = await apiClient.post(url, seller);
  return (response.data ?? seller) as SellerType;
};

export const updateSeller = async (params: {
  backendUrl: string | undefined;
  sellerId: string;
  seller: SellerType;
}): Promise<SellerType> => {
  const { backendUrl, sellerId, seller } = params;
  const url = getBackendUrl(backendUrl, `api/seller/${encodeURIComponent(sellerId)}`);
  await apiClient.put(url, seller);
  return seller;
};

export const deleteSeller = async (params: {
  backendUrl: string | undefined;
  sellerId: string;
}): Promise<void> => {
  const { backendUrl, sellerId } = params;
  const url = getBackendUrl(backendUrl, `api/seller/${encodeURIComponent(sellerId)}`);
  await apiClient.delete(url);
};

export const toggleSellerStatus = async (params: {
  backendUrl: string | undefined;
  sellerId: string;
}): Promise<void> => {
  const { backendUrl, sellerId } = params;
  const url = getBackendUrl(backendUrl, `api/disableseller/${encodeURIComponent(sellerId)}`);
  await apiClient.post(url, {});
};

export const assignSellerPackages = async (params: {
  backendUrl: string | undefined;
  sellerId: string;
  packagesListIds: string[];
}): Promise<void> => {
  const { backendUrl, sellerId, packagesListIds } = params;
  const url = getBackendUrl(backendUrl, `api/tariffSeller/${encodeURIComponent(sellerId)}`);
  await apiClient.put(url, { TariffIds: packagesListIds });
};
