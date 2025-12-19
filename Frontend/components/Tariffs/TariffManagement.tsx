"use client";
import axios from "axios";
import type { ComponentRef } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useMyContext } from "@/context/MyContext";
import type TariffType from "@/models/TariffType";

import Messages from "../General/Messages";
import AddTariff from "./AddTariff";
import TariffGrid from "./TariffGrid";

const TariffManagement = (): React.ReactElement | null => {
  const { user, config } = useMyContext();
  const [tariffList, setTariffList] = useState<TariffType[]>([]);
  const [loading, setLoading] = useState(false);

  type MessagesHandle = ComponentRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  const LaodTariff = useCallback(async (): Promise<void> => {
    try {
      const url = new URL("api/tariffs/true/Admin", config.BACKEND_URL);
      const resultTariff = await axios.get(url.toString(), {
        headers: { Authorization: "Bearer " + user.Token },
      });

      setTariffList(resultTariff.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [config.BACKEND_URL, user.Token]);

  useEffect(() => {
    if (user.Token !== "") LaodTariff();
  }, [LaodTariff, user.Token]);

  const onAddClick = async (tariff: TariffType): Promise<void> => {
    setLoading(true);
    try {
      const url = new URL("api/tariff", config.BACKEND_URL);

      await axios.post(url.toString(), tariff, {
        headers: { Authorization: "Bearer " + user.Token },
      });
      refMessages.current?.Show("success", "Package Insert Successful!");
    } catch (error) {
      console.log(error);
    } finally {
      LaodTariff();
    }
  };

  const onDisableAccountClick = async (tariff: TariffType): Promise<void> => {
    setLoading(true);
    try {
      const url = new URL("api/disabletariff/" + tariff._id, config.BACKEND_URL);

      await axios.post(
        url.toString(),
        {},
        {
          headers: { Authorization: "Bearer " + user.Token },
        },
      );
      refMessages.current?.Show("success", "Package Change Successful!");
    } catch (error) {
      console.log(error);
    } finally {
      LaodTariff();
    }
  };

  const onFreeChangedClick = async (tariff: TariffType): Promise<void> => {
    setLoading(true);
    try {
      const url = new URL("api/freechanged/" + tariff._id, config.BACKEND_URL);

      await axios.post(
        url.toString(),
        {},
        {
          headers: { Authorization: "Bearer " + user.Token },
        },
      );
      refMessages.current?.Show("success", "Package Change Successful!");
    } catch (error) {
      console.log(error);
    } finally {
      LaodTariff();
    }
  };

  const onMessage = (messageType: string, message: string): void => {
    refMessages.current?.Show(messageType == "success" ? "success" : "error", message);
  };

  return (
    <div className="row w-100 border border-solid-1 border-secondary.light rounded py-2">
      <div className="col-12">
        <Messages ref={refMessages}></Messages>
        <AddTariff onAdding={onAddClick}></AddTariff>
        <TariffGrid
          Tariffs={tariffList}
          Loading={loading}
          onDisableAccount={onDisableAccountClick}
          onFreeChanged={onFreeChangedClick}
          onMessage={onMessage}
        />
      </div>
    </div>
  );
};
export default TariffManagement;
