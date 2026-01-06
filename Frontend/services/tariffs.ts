import type TariffType from "@/models/TariffType";
import apiClient from "@/utils/apiClient";

import { getBackendUrl } from "./backend";

export const fetchAdminTariffs = async (params: {
  backendUrl: string | undefined;
  signal?: AbortSignal;
}): Promise<TariffType[]> => {
  const { backendUrl, signal } = params;
  const url = getBackendUrl(backendUrl, "api/tariffs/true/Admin");
  const requestConfig = signal ? { signal } : undefined;
  const result = await apiClient.get<TariffType[]>(url, requestConfig);
  return Array.isArray(result.data) ? result.data : [];
};

export const fetchSellerTariffs = async (params: {
  backendUrl: string | undefined;
  sellerUsername: string;
  signal?: AbortSignal;
}): Promise<TariffType[]> => {
  const { backendUrl, sellerUsername, signal } = params;
  const url = getBackendUrl(backendUrl, `api/tariffs/false/${encodeURIComponent(sellerUsername)}`);
  const requestConfig = signal ? { signal } : undefined;
  const result = await apiClient.get<TariffType[]>(url, requestConfig);
  return Array.isArray(result.data) ? result.data : [];
};

export const addTariff = async (params: {
  backendUrl: string | undefined;
  tariff: TariffType;
}): Promise<TariffType> => {
  const { backendUrl, tariff } = params;
  const url = getBackendUrl(backendUrl, "api/tariff");
  const response = await apiClient.post(url, tariff);
  return (response.data ?? tariff) as TariffType;
};

export const toggleTariffVisibility = async (params: {
  backendUrl: string | undefined;
  tariffId: string;
}): Promise<void> => {
  const { backendUrl, tariffId } = params;
  const url = getBackendUrl(backendUrl, `api/disabletariff/${encodeURIComponent(tariffId)}`);
  await apiClient.post(url, {});
};

export const toggleTariffFree = async (params: {
  backendUrl: string | undefined;
  tariffId: string;
}): Promise<void> => {
  const { backendUrl, tariffId } = params;
  const url = getBackendUrl(backendUrl, `api/freechanged/${encodeURIComponent(tariffId)}`);
  await apiClient.post(url, {});
};
