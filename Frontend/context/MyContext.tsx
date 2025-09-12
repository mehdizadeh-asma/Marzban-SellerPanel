"use client";

import React, { createContext, useContext } from "react";

type UserType = {
  Username: string;
  IsAdmin: boolean;
  Token: string;
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
  setUser: (data: UserType) => void;
  config: JsonData;
  setConfig: (data: JsonData) => void;
};

const MyContext = createContext<MyContextType | undefined>(undefined);

interface PropsType {
  children: React.ReactNode;
}

export const MyContextProvider: React.FC<PropsType> = (props): React.ReactElement => {
  const [user, setUser] = React.useState({
    Username: "",
    IsAdmin: false,
    Token: "",
    Limit: 5,
    TotalPrice: 5,
  });
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
