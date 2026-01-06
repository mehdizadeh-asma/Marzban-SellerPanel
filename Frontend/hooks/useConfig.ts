import { useEffect } from "react";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import type { JsonData } from "@/context/MyContext";
import { useMyContext } from "@/context/MyContext";
import { fetchConfig } from "@/services/config";

export const useConfig = (): UseQueryResult<JsonData> => {
  const { setConfig } = useMyContext();

  const configQuery = useQuery<JsonData>({
    queryKey: ["config"],
    queryFn: async ({ signal }) => fetchConfig(signal),
    staleTime: 20 * 60 * 1000,
  });

  useEffect(() => {
    if (configQuery.data) {
      setConfig(configQuery.data);
    }
  }, [configQuery.data, setConfig]);

  return configQuery;
};
