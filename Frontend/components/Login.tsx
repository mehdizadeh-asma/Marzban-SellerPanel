"use client";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Image } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

import type { JsonData } from "@/context/MyContext";
import { useMyContext } from "@/context/MyContext";
import { decrypt } from "@/utils/Crypto";
import type { AxiosError } from "axios";

export default function Login(): React.ReactElement {
  const router = useRouter();

  const { setUser, config, setConfig } = useMyContext();
  const [Loading, setLoading] = useState(false);

  const UsernameText = useRef<HTMLInputElement | null>(null);
  const PasswordText = useRef<HTMLInputElement | null>(null);
  const Message = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const getConfig = async (): Promise<void> => {
      const result = await axios("/api/getconfig");
      const decText = decrypt(result.data);
      const configData: JsonData = JSON.parse(decText);
      setConfig(configData);
    };
    getConfig();
  }, [setConfig]);
  const Login_Click = async (): Promise<void> => {
    setLoading(true);
    try {
      if (config.BACKEND_URL) {
        const url = config.BACKEND_URL + "/api/marzban/logintomarzban";

        const resultAccounts = await axios.post(url, {
          username: UsernameText.current?.value,
          password: PasswordText?.current?.value,
        });
        if (resultAccounts.status == 200) {
          setUser({
            Username: resultAccounts.data.Username,
            IsAdmin: resultAccounts.data.IsAdmin,
            Token: resultAccounts.data.Token,
            Limit: resultAccounts.data.Limit,
            TotalPrice: resultAccounts.data.TotalPrice,
          });
          router.push("/dashboard");
        } else {
          if (Message.current) Message.current.innerText = "Something Is Wrong!";
          setLoading(false);
        }
      } else if (Message.current) {
        Message.current.innerText = "BACKEND_URL doesn't exist!";
        setLoading(false);
      }
    } catch (error: unknown) {
      console.log(error);

      if (Message.current) {
        if (isAxiosError(error) && error.message === "Network Error") {
          Message.current.innerText = "Backend Is Not Available";
        }

        if (
          isAxiosError(error) &&
          error.response?.data &&
          typeof error.response.data === "object" &&
          "Message" in error.response.data &&
          error.response.data.Message === "Invalid Account Information"
        ) {
          Message.current.innerText = "Invalid Username or Password";
        }
      }

      setLoading(false);
    }

    function isAxiosError(error: unknown): error is AxiosError {
      return (
        typeof error === "object" &&
        error !== null &&
        "isAxiosError" in error &&
        (error as Record<string, unknown>).isAxiosError === true
      );
    }
  };

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
      <input
        type="text"
        name="Login"
        id="txtusername"
        ref={UsernameText}
        className="rounded-1 border-1 BorderPurple mt-1 p-1 FullPurpleColor"
      />
      <input
        type="password"
        name="Password"
        id="txtpassword"
        ref={PasswordText}
        className="rounded-1 border-1 BorderPurple mt-1 p-1 FullPurpleColor"
      />

      <Button
        variant="primary"
        onClick={Login_Click}
        className="rounded-1 border-1  BorderPurple btn-success  mt-1 text-dark  text-uppercase text-white BtnGrdPurple p-1"
      >
        <Spinner
          as="span"
          animation="border"
          size="sm"
          role="status"
          aria-hidden="true"
          className={Loading ? "mx-1" : "visually-hidden"}
        />
        {Loading ? "" : "LOGIN"}
      </Button>

      <h6 id="message" className="text-danger py-3 text-center" ref={Message}></h6>
    </div>
  );
}
