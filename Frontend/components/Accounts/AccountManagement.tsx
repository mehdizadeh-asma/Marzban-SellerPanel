"use client";
import type { ComponentRef, ReactElement } from "react";
import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";

import Deselect from "@mui/icons-material/Deselect";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import GridOnIcon from "@mui/icons-material/GridOn";
import PaymentsIcon from "@mui/icons-material/Payments";
import SearchRounded from "@mui/icons-material/SearchRounded";
import type { AlertColor } from "@mui/material";
import { TextField } from "@mui/material";

import { useMyContext } from "@/context/MyContext";
import { useAccounts } from "@/hooks/useAccounts";
import type AccountType from "@/models/AccountType";
import type TariffType from "@/models/TariffType";

import Messages from "../General/Messages";
import AddAccount from "./AddAccount";
import type { BaseGridHandle } from "./BaseAccountGrid";
import DeleteModal from "./DeleteModal";
import ExpandableAccountGrid from "./ExpandableAccountGrid";
import GeneralAccountGrid from "./GeneralAccountGrid";
import RenewModal from "./RenewModal";

export default function AccountManagement(): ReactElement {
  const { user, config } = useMyContext();
  const gridGeneralRef = useRef<BaseGridHandle>(null);
  const gridExpandableRef = useRef<BaseGridHandle>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountType>();
  const [searchText, setSearchText] = useState("");
  const [gridType, setgridType] = useState("Expandable");
  const [showAll, setShowAll] = useState(false);

  type DeleteModalHandle = ComponentRef<typeof DeleteModal>;
  const refDeleteModal = useRef<DeleteModalHandle>(null);

  type RenewModalHandle = ComponentRef<typeof RenewModal>;
  const refRenewModal = useRef<RenewModalHandle>(null);

  type MessagesHandle = ComponentRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  const txtSearch = useRef<HTMLInputElement | null>(null);

  const notify = useCallback((severity: AlertColor, text: string): void => {
    refMessages.current?.Show(severity, text);
  }, []);

  const {
    accounts,
    unpaidUsernames,
    loading,
    addAccount,
    deleteAccount,
    renewAccount,
    disableAccount,
    revokeSubscription,
    togglePayment,
    payAll,
  } = useAccounts({ showAll, onMessage: notify });

  const accountList = useMemo(() => accounts ?? [], [accounts]);
  const deferredSearchText = useDeferredValue(searchText);
  const filteredAccounts = useMemo(() => {
    const text = deferredSearchText.trim().toLowerCase();
    if (!text) {
      return accountList;
    }
    return accountList.filter((account) => {
      const username = String(account.username ?? "").toLowerCase();
      const note = String(account.note ?? "").toLowerCase();
      return username.includes(text) || note.includes(text);
    });
  }, [accountList, deferredSearchText]);

  const onRenewClick = (account: AccountType): void => {
    const paid = !unpaidUsernames.has(account.username);
    if (
      (paid || config.RENEW_FORCE_TO_PAID?.toUpperCase() !== "YES") &&
      (account.status === "expired" ||
        account.status === "limited" ||
        config.RENEW_FORCE_TO_LIMITED_AND_EXPIRED?.toUpperCase() !== "YES")
    ) {
      refRenewModal.current?.Show(account.username);
    }
  };

  const onDeleteClick = (account: AccountType): void => {
    const ignore = config.IGNORE_TRAFFIC_TO_REMOVE ? +config.IGNORE_TRAFFIC_TO_REMOVE : 1.2;
    if (
      user.IsAdmin ||
      (account.payed !== "Paid" && account.used_traffic < +ignore * 1024 * 1024 * 1024)
    ) {
      setSelectedAccount(account);
      refDeleteModal.current?.Show(account.username);
    }
  };

  const onDisabledClick = (account: AccountType): void => {
    if (account.status === "active" || account.status === "disabled") {
      const nextStatus = account.status === "active" ? "disabled" : "active";
      disableAccount({ account, nextStatus });
    }
  };

  const onRevokeClick = (account: AccountType): void => {
    revokeSubscription(account);
  };

  const onPaymentClick = (accountId: string): void => {
    togglePayment(accountId);
  };

  const onPayAllClick = (): void => {
    const accountIds = GetAccountIdToPay();
    payAll(accountIds);
  };

  const GetAccountIdToPay = useCallback(() => {
    let accountIds: string[] = [];
    if (gridType === "Expandable" && gridExpandableRef.current) {
      accountIds = gridExpandableRef.current.SendBackUsernames();
    } else if (gridType === "General" && gridGeneralRef.current) {
      accountIds = gridGeneralRef.current.SendBackUsernames();
    }
    return accountIds;
  }, [gridType]);

  const OnAddClick = (tariff: TariffType, note: string, onHold: boolean): void => {
    addAccount(tariff, note, onHold);
  };

  const GridTypeChoose_Click = (): void => {
    if (gridType === "Expandable") setgridType("General");
    else setgridType("Expandable");
  };

  const UnFilter_Click = (): void => {
    setShowAll(true);
    setSearchText("");
  };

  const DeleteAccount = (): void => {
    if (selectedAccount) {
      deleteAccount(selectedAccount);
    }
  };

  const RenewAccount = (username: string, tariff: TariffType): void => {
    renewAccount(username, tariff);
  };

  const Search_Click = (): void => {
    if (txtSearch.current && txtSearch.current?.value != "") {
      setSearchText(txtSearch.current.value);
    } else {
      setSearchText("");
      setShowAll(false);
    }
  };

  return (
    <div className="container-fluid bg-primery  ">
      {!user.IsAdmin ? (
        <AddAccount onAdding={OnAddClick} Loading={loading} onMessage={notify} />
      ) : (
        ""
      )}
      <div className="row">
        <div className="col justify-content-start d-flex mt-1  w-100">
          <TextField
            variant="outlined"
            label="Search Username Or Note"
            inputRef={txtSearch}
            sx={{ minWidth: 250, width: 300 }}
          />
          <button
            onClick={Search_Click}
            className="btn btnAdd  BgGrdColorizePurple text-white border-1 BorderPurple h-75   my-auto mx-1 SearchButton w-sx-25 w-md-100"
          >
            <SearchRounded />
          </button>
        </div>
        <div className="col justify-content-end d-flex mt-1">
          <button className="btn border-2 border border-success p-1" onClick={UnFilter_Click}>
            <FilterAltOffIcon sx={{ fontSize: "30px" }} className="text-success  " />
          </button>
          {user.IsAdmin ? (
            <button
              className="btn border-2 border border-success px-1 py-1 mx-2"
              onClick={onPayAllClick}
            >
              <PaymentsIcon sx={{ fontSize: "28px" }} className="text-success  " />
            </button>
          ) : (
            ""
          )}
          {gridType === "Expandable" ? (
            <button
              className="btn border-2 border border-success p-1"
              onClick={GridTypeChoose_Click}
            >
              <GridOnIcon sx={{ fontSize: "30px" }} className="text-success  " />
            </button>
          ) : (
            <button
              className="btn border-2 border border-success p-1"
              onClick={GridTypeChoose_Click}
            >
              <Deselect sx={{ fontSize: "30px" }} className="text-success  " />
            </button>
          )}
        </div>
      </div>
      <div className="row mt-1">
        <div className="col-12">
          <Messages ref={refMessages}></Messages>
          <div className="ContainerGrid">
            {gridType === "Expandable" ? (
              <ExpandableAccountGrid
                ref={gridExpandableRef}
                Accounts={filteredAccounts}
                Loading={loading}
                onDeleting={onDeleteClick}
                onDisabling={onDisabledClick}
                onRenewing={onRenewClick}
                onPaying={onPaymentClick}
                onRevoke={onRevokeClick}
              />
            ) : (
              <GeneralAccountGrid
                ref={gridGeneralRef}
                Accounts={filteredAccounts}
                Loading={loading}
                onDeleting={onDeleteClick}
                onDisabling={onDisabledClick}
                onRenewing={onRenewClick}
                onPaying={onPaymentClick}
                onRevoke={onRevokeClick}
              />
            )}
          </div>
        </div>
      </div>
      <DeleteModal DeletingHandler={DeleteAccount} ref={refDeleteModal}></DeleteModal>
      <RenewModal RenewHandler={RenewAccount} ref={refRenewModal} onMessage={notify}></RenewModal>
      <div className="my-3">
        <br />
      </div>
    </div>
  );
}
