"use client";
import {
  ElementRef,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  DataGrid,
  GridActionsCellItem,
  GridRenderCellParams,
} from "@mui/x-data-grid";
import LinearProgress from "@mui/material/LinearProgress";
import Box from "@mui/material/Box";
import DeleteIcon from "@mui/icons-material/Delete";
import RenewIcon from "@mui/icons-material/RecyclingOutlined";
import LinkIcon from "@mui/icons-material/Link";
import CheckIcon from "@mui/icons-material/Check";
import WatchLaterIcon from "@mui/icons-material/WatchLater";
import CreditScoreRoundedIcon from "@mui/icons-material/CreditScoreRounded";
import CreditCardOffRoundedIcon from "@mui/icons-material/CreditCardOffRounded";
import GppMaybeRoundedIcon from "@mui/icons-material/GppMaybeRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import GppBadRoundedIcon from "@mui/icons-material/GppBadRounded";
import SafetyCheckRoundedIcon from "@mui/icons-material/SafetyCheckRounded";
import CircleIcon from "@mui/icons-material/Circle";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import QrCode2Icon from "@mui/icons-material/QrCode2";

import AccountType from "@/models/AccountType";
import { copyTextToClipboard } from "@/utils/Helper";
import QRModal from "./QRModal";
import { Checkbox } from "@mui/material";

interface PropsType {
  Loading: boolean;
  Accounts: AccountType[];
  onDeleting: (account: AccountType) => void;
  onRenewing: (account: AccountType) => void;
  onDisabling: (account: AccountType) => void;
  onPaying: (account: AccountType) => void;
}
export interface ForwardRefHandle {
  SendBackUsernames: () => string[];
}

const label = { inputProps: { "aria-label": "Checkbox demo" } };

const AccountGrid = forwardRef<ForwardRefHandle, PropsType>((props, ref) => {
  const [selectedLink, setSelectedLink] = useState("");
  const [UsernamesToPay, setUsernamesToPay] = useState<string[]>([]);

  type QRModalHandle = ElementRef<typeof QRModal>;
  const refQRModal = useRef<QRModalHandle>(null);

  const columns = [
    {
      headerClassName: "MUIGridHeader",
      headerName: "",
      field: "link",
      type: "actions",
      width: 160,
      getActions: (params: { row: AccountType }) => [
        <GridActionsCellItem
          key="checkPay"
          label="Check To Pay"
          icon={<Checkbox {...label} />}
          onClick={() => onCheckPay(params.row)}
        />,
        <GridActionsCellItem
          key="link"
          label="Link"
          icon={
            params.row.username === selectedLink ? (
              <CheckIcon className="text-primary" />
            ) : (
              <LinkIcon className="text-primary" />
            )
          }
          onClick={() => onCopyLink(params.row)}
        />,
        <GridActionsCellItem
          key="qr"
          label="QR"
          icon={<QrCode2Icon className="text-primary" />}
          onClick={() => onQRClick(params.row)}
        />,
        <GridActionsCellItem
          key="renew"
          label="Renew"
          icon={<RenewIcon className="text-success" />}
          onClick={() => onRenewClick(params.row)}
        />,
      ],
    },
    {
      field: "username",
      headerName: "Username",
      width: 150,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "note",
      headerName: "Note",
      width: 100,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "online",
      headerName: "",
      width: 10,
      renderCell: (params: GridRenderCellParams<AccountType, string>) =>
        RenderOnline(params.value),
      headerClassName: "MUIGridHeader",
    },
    {
      field: "online_at",
      headerName: "Online",
      width: 120,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "package",
      headerName: "Package",
      width: 170,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "price",
      headerName: "Price",
      width: 50,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "data_limit_string",
      headerName: "Limit",
      width: 90,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "used_traffic_string",
      headerName: "Usage",
      width: 140,
      renderCell: (params: GridRenderCellParams<AccountType, string>) =>
        RenderUsage(params.row),
      headerClassName: "MUIGridHeader",
    },
    {
      field: "expire_string",
      headerName: "Expire",
      width: 110,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params: GridRenderCellParams<AccountType, string>) =>
        RenderStatus(params.value),
      headerClassName: "MUIGridHeader",
    },
    {
      field: "sub_updated_at",
      headerName: "Last Update (Subscription)",
      width: 110,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "sub_last_user_agent",
      headerName: "Last App (Subscription)",
      width: 100,
      headerClassName: "MUIGridHeader",
    },
    {
      headerName: "Payment",
      field: "payed",
      type: "actions",
      width: 90,
      headerClassName: "MUIGridHeader",
      getActions: (params: { row: AccountType }) => [
        <GridActionsCellItem
          key="paid"
          label="Paid"
          icon={RenderPayment(params.row.payed)}
          onClick={() => onPaymentClick(params.row)}
        />,
      ],
    },
    {
      headerName: "",
      field: "delete",
      type: "actions",
      width: 140,
      headerClassName: "MUIGridHeader",
      getActions: (params: { row: AccountType }) => [
        <GridActionsCellItem
          key="delete"
          label="Delete"
          icon={<DeleteIcon className="text-danger" />}
          onClick={() => onDeleteClick(params.row)}
        />,
        <GridActionsCellItem
          key="disable"
          label="disable"
          icon={
            params.row.status === "disabled" ? (
              <ToggleOffIcon
                className="text-secondry "
                sx={{ fontSize: "35px" }}
              />
            ) : (
              <ToggleOnIcon
                sx={{ fontSize: "35px" }}
                className="text-success "
              />
            )
          }
          onClick={() => onDisableAccount(params.row)}
        />,
      ],
    },
  ];

  useImperativeHandle(ref, () => ({
    SendBackUsernames: () => {
      return [...UsernamesToPay];
    },
  }));

  const onCheckPay = (account: AccountType) => {
    if (account.username) {
      setUsernamesToPay((prevUsernames) =>
        prevUsernames.includes(account.username)
          ? prevUsernames.filter((id) => id !== account.username)
          : [...prevUsernames, account.username],
      );
    }
  };
  const onPaymentClick = (account: AccountType) => {
    props.onPaying(account);
  };

  const RenderOnline = (online: string | undefined) => {
    switch (online) {
      case "Online":
        return (
          <span className="text-success  ">
            <CircleIcon className="w-100 border border-3 border-success rounded-circle"></CircleIcon>
          </span>
        );
      case "Offline":
        return (
          <span className="text-danger  ">
            <CircleIcon className="w-100 border border-3 border-danger rounded-circle "></CircleIcon>
          </span>
        );
      case "Never":
        return (
          <span className="text-warning">
            <CircleIcon className="w-100 border border-3 border-secondary rounded-circle"></CircleIcon>
          </span>
        );
    }
  };

  const RenderStatus = (status: string | undefined) => {
    switch (status) {
      case "active":
        return (
          <span className="text-success">
            <GppGoodRoundedIcon></GppGoodRoundedIcon>Active
          </span>
        );
      case "on_hold":
        return (
          <span className="text-purple">
            <WatchLaterIcon></WatchLaterIcon>On Hold
          </span>
        );
      case "disabled":
        return (
          <span className="text-secondary">
            <GppBadRoundedIcon></GppBadRoundedIcon>Disabled
          </span>
        );
      case "expired":
        return (
          <span className="text-primary">
            <SafetyCheckRoundedIcon></SafetyCheckRoundedIcon>Expired
          </span>
        );
      case "limited":
        return (
          <span className="text-danger">
            <GppMaybeRoundedIcon></GppMaybeRoundedIcon>Limited
          </span>
        );
    }
  };

  const RenderPayment = (payment: string | undefined) => {
    return payment === "Paid" ? (
      <span className="text-success">
        <CreditScoreRoundedIcon></CreditScoreRoundedIcon>
        {/* <text className="h6  ">Paid</text> */}
      </span>
    ) : (
      <span className="text-secondary">
        <CreditCardOffRoundedIcon></CreditCardOffRoundedIcon>
        {/* <text className="h6 ">Unpaid</text> */}
      </span>
    );
  };

  const RenderUsage = (account: AccountType) => {
    return (
      <Box sx={{ width: "100%" }}>
        {account.used_traffic_string}
        <LinearProgress
          variant="determinate"
          value={(account.used_traffic / account.data_limit) * 100}
        />
      </Box>
    );
  };

  const onCopyLink = (account: AccountType) => {
    copyTextToClipboard(account.subscription_url);
    setSelectedLink(account.username);
  };

  const onRenewClick = (account: AccountType) => {
    props.onRenewing(account);
  };

  const onQRClick = (account: AccountType) => {
    refQRModal.current?.Show(account.subscription_url, account.username);
  };

  const onDeleteClick = (account: AccountType) => {
    props.onDeleting(account);
  };

  const onDisableAccount = (account: AccountType) => {
    props.onDisabling(account);
  };

  return (
    <>
      <DataGrid
        initialState={{
          pagination: { paginationModel: { pageSize: 100 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        className="Grid"
        rows={props.Accounts}
        columns={columns}
        loading={props.Loading}
        sx={{
          boxShadow: 2,
          border: 2,
          borderColor: "purple",
          width: "100%",
          "& .MuiDataGrid-:hover": {
            backgroundColor: "lightgray",
            color: "purple",
            fontWeight: "bold",
          },
          "& .MuiDataGrid-row": {
            backgroundColor: "#f5f5f5",
          },
          "& .MuiDataGrid-cell": {
            textAlign: "center",
          },
        }}
      />
      <QRModal ref={refQRModal}></QRModal>
    </>
  );
});

AccountGrid.displayName = "AccountGrid";

export default AccountGrid;
