import type TariffInboundType from "@/models/TariffInboundType";
import apiClient from "@/utils/apiClient";

import { getBackendUrl } from "./backend";

export type TariffInboundPayloadItem = {
  InboundTag: string;
  InboundType: string;
};

export const fetchTariffInbounds = async (params: {
  backendUrl: string | undefined;
  tariffId: string;
  signal?: AbortSignal;
}): Promise<TariffInboundType[]> => {
  const { backendUrl, tariffId, signal } = params;
  const url = getBackendUrl(backendUrl, `api/TariffInbound/${encodeURIComponent(tariffId)}`);
  const requestConfig = signal ? { signal } : undefined;
  const result = await apiClient.get<TariffInboundType[]>(url, requestConfig);
  return Array.isArray(result.data) ? result.data : [];
};

export const saveTariffInbounds = async (params: {
  backendUrl: string | undefined;
  tariffId: string;
  payload: TariffInboundPayloadItem[];
}): Promise<void> => {
  const { backendUrl, tariffId, payload } = params;
  const url = getBackendUrl(backendUrl, `api/TariffInbound/${encodeURIComponent(tariffId)}`);
  await apiClient.put(url, payload);
};
