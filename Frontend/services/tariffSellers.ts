import type TariffSellerAssignmentType from "@/models/TariffSellerAssignmentType";
import apiClient from "@/utils/apiClient";

import { getBackendUrl } from "./backend";

export const fetchSellerTariffAssignments = async (params: {
  backendUrl: string | undefined;
  sellerId: string;
  signal?: AbortSignal;
}): Promise<TariffSellerAssignmentType[]> => {
  const { backendUrl, sellerId, signal } = params;
  const url = getBackendUrl(backendUrl, `api/tariffSeller/${encodeURIComponent(sellerId)}`);
  const requestConfig = signal ? { signal } : undefined;
  const result = await apiClient.get<TariffSellerAssignmentType[]>(url, requestConfig);
  return Array.isArray(result.data) ? result.data : [];
};
