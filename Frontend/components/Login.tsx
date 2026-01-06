"use client";
import type { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactElement } from "react";
import { Image } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { useForm } from "react-hook-form";

import { useMyContext } from "@/context/MyContext";
import { useConfig } from "@/hooks/useConfig";
import { useLogin } from "@/hooks/useLogin";
import { isInvalidBackendUrlError } from "@/services/backend";

export default function Login(): ReactElement {
  const router = useRouter();

  const { setUser, config } = useMyContext();
  const [message, setMessage] = useState("");

  type LoginResponse = {
    Username?: string;
    IsAdmin?: boolean;
    Limit?: number;
    TotalPrice?: number;
    accessToken?: string;
    access_token?: string;
    token?: string;
    Message?: string;
  };
  type ParsedLoginResponse = Required<
    Pick<LoginResponse, "Username" | "IsAdmin" | "Limit" | "TotalPrice">
  >;

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

  const getAccessToken = (data: Record<string, unknown>): string => {
    const tokenValue = data.accessToken ?? data.access_token ?? data.token;
    return typeof tokenValue === "string" ? tokenValue.trim() : "";
  };

  const parseLoginResponse = (data: Record<string, unknown>): ParsedLoginResponse | null => {
    const username = typeof data.Username === "string" ? data.Username : "";
    const isAdmin = typeof data.IsAdmin === "boolean" ? data.IsAdmin : null;
    const limit = typeof data.Limit === "number" ? data.Limit : null;
    const totalPrice = typeof data.TotalPrice === "number" ? data.TotalPrice : null;

    if (!username || isAdmin === null || limit === null || totalPrice === null) {
      return null;
    }

    return {
      Username: username,
      IsAdmin: isAdmin,
      Limit: limit,
      TotalPrice: totalPrice,
    };
  };
  const isAxiosError = (error: unknown): error is AxiosError => {
    return (
      typeof error === "object" &&
      error !== null &&
      "isAxiosError" in error &&
      (error as Record<string, unknown>).isAxiosError === true
    );
  };

  const configQuery = useConfig();

  useEffect(() => {
    if (configQuery.isError) {
      setMessage("Failed to load configuration.");
    }
  }, [configQuery.isError]);

  const loginMutation = useLogin({
    onSuccess: (resultAccounts) => {
      if (resultAccounts.status === 200) {
        if (!isRecord(resultAccounts.data)) {
          setMessage("Invalid response format.");
          return;
        }
        const accessToken = getAccessToken(resultAccounts.data);
        if (!accessToken) {
          setMessage("Access token is missing.");
          return;
        }
        const parsed = parseLoginResponse(resultAccounts.data);
        if (!parsed) {
          setMessage("Invalid response format.");
          return;
        }
        setUser({
          Username: parsed.Username,
          IsAdmin: parsed.IsAdmin,
          accessToken: accessToken,
          Limit: parsed.Limit,
          TotalPrice: parsed.TotalPrice,
        });
        router.push("/dashboard");
      } else {
        setMessage("Something Is Wrong!");
      }
    },
    onError: (error: unknown) => {
      console.log(error);

      if (isInvalidBackendUrlError(error)) {
        setMessage("BACKEND_URL is invalid or not HTTPS.");
        return;
      }

      if (isAxiosError(error) && error.message === "Network Error") {
        setMessage("Backend Is Not Available");
      }

      if (
        isAxiosError(error) &&
        error.response?.data &&
        typeof error.response.data === "object" &&
        "Message" in error.response.data &&
        error.response.data.Message === "Invalid Account Information"
      ) {
        setMessage("Invalid Username or Password");
      }
    },
  });

  const { register, handleSubmit, formState } = useForm<{ username: string; password: string }>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = (values: { username: string; password: string }): void => {
    loginMutation.mutate(values);
  };
  const handleFormSubmit = handleSubmit(onSubmit);

  return (
    <div className="firstdiv col-6 d-flex flex-column justify-content-center h-100 border border-1 border-muted  rounded-3 shadow shadow-lg ">
      <Image
        id="imgPreview88"
        className=" img-fluid align-self-center HoverRescale rounded-3 shadow"
        src="../logo.gif"
        alt="logo"
        height="120vh"
        width="120vw"
      />

      <h4 className="HeadLine ExploreDiv HoverRescale mt-3 FullPurpleColor ">
        {config.CHANNEL_NAME}
      </h4>
      <form
        onSubmit={(event): void => {
          void handleFormSubmit(event);
        }}
      >
        <input
          type="text"
          id="txtusername"
          className="rounded-1 border-1 BorderPurple mt-1 p-1 FullPurpleColor"
          {...register("username", { required: "Username is required." })}
        />
        <input
          type="password"
          id="txtpassword"
          className="rounded-1 border-1 BorderPurple mt-1 p-1 FullPurpleColor"
          {...register("password", { required: "Password is required." })}
        />

        <Button
          variant="primary"
          type="submit"
          className="rounded-1 border-1  BorderPurple btn-success  mt-1 text-dark  text-uppercase text-white BtnGrdPurple p-1"
          disabled={loginMutation.isPending}
        >
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
            className={loginMutation.isPending ? "mx-1" : "visually-hidden"}
          />
          {loginMutation.isPending ? "" : "LOGIN"}
        </Button>
        {formState.errors.username ? (
          <div className="text-danger mt-1">{formState.errors.username.message}</div>
        ) : null}
        {formState.errors.password ? (
          <div className="text-danger mt-1">{formState.errors.password.message}</div>
        ) : null}
      </form>

      <h6 id="message" className="text-danger py-3 text-center">
        {message}
      </h6>
    </div>
  );
}
