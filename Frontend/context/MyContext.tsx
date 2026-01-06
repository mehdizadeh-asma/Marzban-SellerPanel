"use client";

import React, { createContext, useContext } from "react";

import { setApiAccessToken } from "@/utils/apiClient";

type UserType = {
  Username: string;
  IsAdmin: boolean;
  accessToken: string;
  Limit: number;
  TotalPrice: number;
};

export interface JsonData {
  BACKEND_URL?: string;
  IGNORE_TRAFFIC_TO_REMOVE?: string;
  RENEW_FORCE_TO_PAID?: string;
  RENEW_FORCE_TO_LIMITED_AND_EXPIRED?: string;
  PAGE_TITLE?: string;
  CHANNEL_NAME?: string;
}

type MyContextType = {
  user: UserType;
  setUser: (data: UserType | ((prev: UserType) => UserType)) => void;
  config: JsonData;
  setConfig: (data: JsonData) => void;
};

const MyContext = createContext<MyContextType | undefined>(undefined);

interface PropsType {
  children: React.ReactNode;
}

export const MyContextProvider: React.FC<PropsType> = (props): React.ReactElement => {
  const [user, setUserState] = React.useState<UserType>({
    Username: "",
    IsAdmin: false,
    accessToken: "",
    Limit: 5,
    TotalPrice: 5,
  });
  const setUser = React.useCallback((data: UserType | ((prev: UserType) => UserType)): void => {
    setUserState((prev) => {
      const nextUser = typeof data === "function" ? data(prev) : data;
      setApiAccessToken(nextUser.accessToken);
      return nextUser;
    });
  }, []);
  const [config, setConfig] = React.useState({});

  return (
    <MyContext.Provider value={{ user, setUser, config, setConfig }}>
      {props.children}
    </MyContext.Provider>
  );
};

export const useMyContext = (): MyContextType => {
  const context = useContext(MyContext);

  if (!context) {
    throw new Error("useMyContext must be used within a MyContextProvider");
  }

  return context;
};
