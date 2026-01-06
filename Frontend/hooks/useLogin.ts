import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { useMyContext } from "@/context/MyContext";
import { loginToMarzban } from "@/services/auth";

type LoginVariables = { username: string; password: string };
type LoginResult = Awaited<ReturnType<typeof loginToMarzban>>;
type UseLoginResult = UseMutationResult<LoginResult, unknown, LoginVariables>;

export const useLogin = (params: {
  onSuccess: (result: LoginResult) => void;
  onError: (error: unknown) => void;
}): UseLoginResult => {
  const { config } = useMyContext();

  return useMutation({
    mutationFn: async (variables: LoginVariables) =>
      loginToMarzban({
        backendUrl: config.BACKEND_URL,
        username: variables.username,
        password: variables.password,
      }),
    onSuccess: params.onSuccess,
    onError: params.onError,
  });
};
