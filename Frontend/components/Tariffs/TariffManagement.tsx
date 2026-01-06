"use client";
import type { ComponentRef, ReactElement } from "react";
import { useCallback, useRef } from "react";

import { useTariffs } from "@/hooks/useTariffs";
import type { AlertColor } from "@mui/material";

import Messages from "../General/Messages";
import AddTariff from "./AddTariff";
import TariffGrid from "./TariffGrid";

const TariffManagement = (): ReactElement | null => {
  type MessagesHandle = ComponentRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  const notify = useCallback((severity: AlertColor, text: string): void => {
    refMessages.current?.Show(severity, text);
  }, []);

  const { tariffs, loading, addTariff, toggleVisibility, toggleFree } = useTariffs({
    onMessage: notify,
  });

  const onMessage = (messageType: string, message: string): void => {
    notify(messageType === "success" ? "success" : "error", message);
  };

  return (
    <div className="row w-100 border border-solid-1 border-secondary.light rounded py-2">
      <div className="col-12">
        <Messages ref={refMessages}></Messages>
        <AddTariff onAdding={addTariff}></AddTariff>
        <TariffGrid
          Tariffs={tariffs}
          Loading={loading}
          onDisableAccount={toggleVisibility}
          onFreeChanged={toggleFree}
          onMessage={onMessage}
        />
      </div>
    </div>
  );
};
export default TariffManagement;
