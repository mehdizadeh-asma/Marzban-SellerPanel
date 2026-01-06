import axios from "axios";

import type { JsonData } from "@/context/MyContext";

export const fetchConfig = async (signal?: AbortSignal): Promise<JsonData> => {
  const requestConfig = signal ? { signal } : undefined;
  const result = await axios.get<JsonData>("/api/getconfig", requestConfig);
  return result.data;
};
