"use client";
import axios from "axios";
import { ElementRef, useCallback, useEffect, useRef, useState } from "react";
import { TextField } from "@mui/material";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import SearchRounded from "@mui/icons-material/SearchRounded";
import PaymentsIcon from "@mui/icons-material/Payments";
import GridOnIcon from "@mui/icons-material/GridOn";
import Deselect from "@mui/icons-material/Deselect";

import { useMyContext } from "@/context/MyContext";
import AddAccount from "./AddAccount";
import DeleteModal from "./DeleteModal";
import RenewModal from "./RenewModal";
import AccountType from "@/models/AccountType";
import TariffType from "@/models/TariffType";
import Messages from "../General/Messages";
import ExpandableAccountGrid, {
  ForwardRefHandle,
} from "./ExpandableAccountGrid";
import AccountGrid from "./AccountGrid";

export default function AccountManagement() {
  const { user, config, setUser } = useMyContext();
  const gridRef = useRef<ForwardRefHandle>(null);
  const [loading, setLoading] = useState(false);
  const [accountList, setAccountList] = useState<AccountType[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountType>();
  const [searchText, setSearchText] = useState("");
  const [gridType, setgridType] = useState("Expandable"); //Regular

  type DeleteModalHandle = ElementRef<typeof DeleteModal>;
  const refDeleteModal = useRef<DeleteModalHandle>(null);

  type RenewModalHandle = ElementRef<typeof RenewModal>;
  const refRenewModal = useRef<RenewModalHandle>(null);

  type MessagesHandle = ElementRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  const txtSearch = useRef<HTMLInputElement | null>(null);

  const onRenewClick = (account: AccountType) => {
    const paid =
      accountList.filter(
        (acc) => acc.username == account.username && acc.payed === "Unpaid",
      ).length == 0;
    if (
      (paid || config.RENEW_FORCE_TO_PAID?.toUpperCase() !== "YES") &&
      (account.status == "expired" ||
        account.status == "limited" ||
        config.RENEW_FORCE_TO_LIMITED_AND_EXPIRED?.toUpperCase() !== "YES") &&
      account.data_limit / (1024 * 1024 * 1024) <= user.Limit
    ) {
      setSelectedAccount(account);
      refRenewModal.current?.Show(account.username);
    }
  };

  const onDeleteClick = (account: AccountType) => {
    const ignore = config.IGNORE_TRAFFIC_TO_REMOVE
      ? +config.IGNORE_TRAFFIC_TO_REMOVE
      : 1.2;
    if (
      user.IsAdmin ||
      (account.payed !== "Paid" &&
        account.used_traffic < +ignore * 1024 * 1024 * 1024)
    ) {
      setSelectedAccount(account);
      refDeleteModal.current?.Show(account.username);
    }
  };

  const onDisabledClick = async (account: AccountType) => {
    if (account.status == "active" || account.status == "disabled")
      try {
        StartLoading();

        const url = new URL(
          "api/marzban/disableaccount/" + account.username,
          config.BACKEND_URL,
        );
        await axios.post(
          url.toString(),
          {
            status: account.status == "active" ? "disabled" : "active",
          },
          {
            headers: { Authorization: "Bearer " + user.Token },
          },
        );
      } catch (error) {
        console.log(error);
      } finally {
        LoadAccount();
      }
  };

  const onPaymentClick = async (account: AccountType) => {
    if (user.IsAdmin)
      try {
        StartLoading();
        const url = new URL(
          "api/payaccount/" + account.username,
          config.BACKEND_URL,
        );
        await axios.post(url.toString(), {
          headers: { Authorization: "Bearer " + user.Token },
        });
      } catch (error) {
        console.log(error);
      } finally {
        LoadAccount();
      }
  };

  const onPayAllClick = async () => {
    if (user.IsAdmin)
      if (gridRef.current) {
        const accountNames = gridRef.current.SendBackUsernames();
        if (
          !Array.isArray(accountNames) ||
          !accountNames.every((name) => typeof name === "string")
        )
          return;

        try {
          StartLoading();
          const url = new URL("api/payaccounts/", config.BACKEND_URL);
          await axios.post(url.toString(), accountNames, {
            headers: { Authorization: "Bearer " + user.Token },
          });
          refMessages.current?.Show(
            "success",
            "Payments Changed Successfully!",
          );
        } catch (error) {
          console.log(error);
        } finally {
          LoadAccount();
        }
      }
  };

  const OnAddClick = async (
    tariff: TariffType,
    note: string,
    onHold: boolean,
  ) => {
    if (user.Limit >= tariff.DataLimit)
      try {
        StartLoading();
        const url = new URL("api/marzban/account", config.BACKEND_URL);

        await axios.post(
          url.toString(),
          {
            username: user.Username,
            note: note,
            tariffId: tariff._id,
            onhold: onHold,
          },
          {
            headers: { Authorization: "Bearer " + user.Token },
          },
        );
        if (!tariff.IsFree) {
          user.Limit -= tariff.DataLimit;
          user.TotalPrice += tariff.Price;
        }
        setUser({ ...user, Limit: user.Limit, TotalPrice: user.TotalPrice });
        refMessages.current?.Show("success", "Account Added Successful!");
      } catch (error) {
        console.log(error);
      } finally {
        LoadAccount();
      }
  };

  const LoadAccount = useCallback(
    async (IsAll: boolean = false) => {
      try {
        StartLoading();
        const url = new URL(
          `api/marzban/accounts/${user.Username}/${IsAll}`,
          config.BACKEND_URL,
        );
        const resultAccounts = await axios.get(url.toString(), {
          headers: { Authorization: "Bearer " + user.Token },
        });
        const accounts = resultAccounts.data;
        setAccountList(accounts);
      } catch (error) {
        console.log(error);
      } finally {
        EndLoading();
      }
    },
    [config.BACKEND_URL, user.Token, user.Username],
  );

  useEffect(() => {
    if (user.Token !== "") LoadAccount();
  }, [LoadAccount, user.Token]);

  useEffect(() => {
    const LoadAccount = async () => {
      try {
        StartLoading();
        const url = new URL(
          `api/marzban/account/${user.Username}/${searchText}`,
          config.BACKEND_URL,
        );
        const resultAccounts = await axios.get(url.toString(), {
          headers: { Authorization: "Bearer " + user.Token },
        });
        const accounts = resultAccounts.data;
        setAccountList(accounts);
      } catch (error) {
        console.log(error);
      } finally {
        EndLoading();
      }
    };
    if (user.Token !== "" && searchText != "") LoadAccount();
  }, [config.BACKEND_URL, searchText, user.Token, user.Username]);

  const GridTypeChoose_Click = () => {
    if (gridType === "Expandable") setgridType("Regular");
    else setgridType("Expandable");
  };

  const UnFilter_Click = () => {
    LoadAccount(true);
  };

  const DeleteAccount = async () => {
    if (selectedAccount)
      try {
        StartLoading();

        const url = new URL(
          "api/marzban/account/" + selectedAccount?.username,
          config.BACKEND_URL,
        );

        await axios.delete(url.toString(), {
          headers: { Authorization: "Bearer " + user.Token },
        });

        user.Limit += selectedAccount?.data_limit / (1024 * 1024 * 1024);
        user.TotalPrice -= selectedAccount?.price;
        setUser({ ...user, Limit: user.Limit, TotalPrice: user.TotalPrice });
      } catch (error) {
        console.log(error);
      } finally {
        LoadAccount();
      }
  };

  const RenewAccount = async (username: string, tariffId: string) => {
    if (selectedAccount)
      try {
        StartLoading();

        const url = new URL(
          "api/marzban/renewaccount/" + user.Username,
          config.BACKEND_URL,
        );

        await axios.post(
          url.toString(),
          {
            username: username,
            tariffId: tariffId,
          },
          {
            headers: { Authorization: "Bearer " + user.Token },
          },
        );

        user.Limit -= selectedAccount?.data_limit / (1024 * 1024 * 1024);
        user.TotalPrice += selectedAccount?.price;
        setUser({ ...user, Limit: user.Limit, TotalPrice: user.TotalPrice });
      } catch (error) {
        console.log(error);
      } finally {
        LoadAccount();
      }
  };

  const StartLoading = () => {
    setLoading(true);
  };

  const EndLoading = () => {
    setLoading(false);
  };

  const Search_Click = () => {
    if (txtSearch.current && txtSearch.current?.value != "")
      setSearchText(txtSearch.current.value);
    else if (searchText != "") {
      LoadAccount();
      setSearchText("");
    } else setSearchText("");
  };

  return (
    <div className="container-fluid bg-primery  ">
      {user.IsAdmin ? "" : <AddAccount onAdding={OnAddClick} Mode="Add" />}
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
          <button
            className="btn border-2 border border-success p-1"
            onClick={UnFilter_Click}
          >
            <FilterAltOffIcon
              sx={{ fontSize: "30px" }}
              className="text-success  "
            />
          </button>
          {user.IsAdmin ? (
            <button
              className="btn border-2 border border-success px-1 py-1 mx-2"
              onClick={onPayAllClick}
            >
              <PaymentsIcon
                sx={{ fontSize: "28px" }}
                className="text-success  "
              />
            </button>
          ) : (
            ""
          )}
          {gridType === "Expandable" ? (
            <button
              className="btn border-2 border border-success p-1"
              onClick={GridTypeChoose_Click}
            >
              <GridOnIcon
                sx={{ fontSize: "30px" }}
                className="text-success  "
              />
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
            {gridType == "Expandable" ? (
              <ExpandableAccountGrid
                ref={gridRef}
                Accounts={accountList}
                Loading={loading}
                onDeleting={onDeleteClick}
                onDisabling={onDisabledClick}
                onRenewing={onRenewClick}
                onPaying={onPaymentClick}
              />
            ) : (
              <AccountGrid
                ref={gridRef}
                Accounts={accountList}
                Loading={loading}
                onDeleting={onDeleteClick}
                onDisabling={onDisabledClick}
                onRenewing={onRenewClick}
                onPaying={onPaymentClick}
              />
            )}
          </div>
        </div>
      </div>
      <DeleteModal
        DeletingHandler={DeleteAccount}
        ref={refDeleteModal}
      ></DeleteModal>
      <RenewModal RenewHandler={RenewAccount} ref={refRenewModal}></RenewModal>
      <div className="my-3">
        <br />
      </div>
    </div>
  );
}
