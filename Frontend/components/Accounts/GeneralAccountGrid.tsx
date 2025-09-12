"use client";
import { forwardRef } from "react";

import {
  GridActionsCellItem,
  GridColDef,
  GridRenderCellParams,
  GridRowParams,
} from "@mui/x-data-grid";

import AccountType from "@/models/AccountType";

import BaseAccountGrid, { BaseGridHandle, BaseGridHelpers } from "./BaseAccountGrid";

interface PropsType {
  Loading: boolean;
  Accounts: AccountType[];
  onDeleting: (account: AccountType) => void;
  onRenewing: (account: AccountType) => void;
  onDisabling: (account: AccountType) => void;
  onPaying: (accountId: string) => void;
  onRevoke: (account: AccountType) => void;
}

const GeneralAccountGrid = forwardRef<BaseGridHandle, PropsType>((props, _ref) => {
  const buildColumns = (helpers: BaseGridHelpers): GridColDef[] => [
    {
      headerName: "",
      field: "select",
      type: "actions",
      width: 50,
      renderHeader: () => helpers.RenderSelectHeader(),
      getActions: (params: GridRowParams<AccountType>) => [
        <GridActionsCellItem
          key="checkPay"
          label="Check To Pay"
          icon={helpers.RenderSelectCheckbox(params.row)}
        />,
      ],
    },
    {
      headerName: "",
      field: "toolbox",
      type: "actions",
      width: 250,
      minWidth: 50,
      maxWidth: 200,
      getActions: (params: GridRowParams<AccountType>) => [
        <GridActionsCellItem
          key="link"
          label="Link"
          icon={helpers.RenderLinkIcon(params.row)}
          onClick={() => helpers.onCopyLink(params.row)}
        />,
        <GridActionsCellItem
          key="qr"
          label="QR"
          icon={helpers.RenderQRIcon(params.row)}
          onClick={() => helpers.onQRClick(params.row)}
        />,
        <GridActionsCellItem
          key="renew"
          label="Renew"
          icon={helpers.RenderRenewIcon(params.row)}
          onClick={() => helpers.onRenewClick(params.row)}
        />,
      ],
    },

    {
      field: "username",
      headerName: "Username",
      width: 150,
      minWidth: 50,
      maxWidth: 160,
      resizable: true,
    },
    {
      field: "note",
      headerName: "Note",
      width: 120,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
    },
    {
      field: "online",
      headerName: "",
      width: 40,
      renderCell: (params: GridRenderCellParams<AccountType, string | undefined>) =>
        helpers.RenderOnline(params.value),
    },
    {
      field: "online_at",
      headerName: "Online",
      width: 120,
      minWidth: 100,
      maxWidth: 150,
      resizable: true,
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      minWidth: 80,
      maxWidth: 150,
      resizable: true,
      renderCell: (params: GridRenderCellParams<AccountType, string | undefined>) =>
        helpers.RenderStatus(params.value),
    },
    {
      field: "package",
      headerName: "Package",
      width: 170,
      minWidth: 50,
      maxWidth: 170,
      resizable: true,
    },
    {
      field: "price",
      headerName: "Price",
      width: 70,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
    },
    {
      field: "data_limit_string",
      headerName: "Limit",
      width: 90,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
    },
    {
      field: "used_traffic_string",
      headerName: "Usage",
      width: 140,
      minWidth: 50,
      maxWidth: 170,
      resizable: true,
      renderCell: (params: GridRenderCellParams<AccountType, unknown>) =>
        helpers.RenderUsage(params.row),
    },
    {
      field: "expire_string",
      headerName: "Expire",
      width: 110,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
    },
    {
      field: "sub_updated_at",
      headerName: "Last Update (Subscription)",
      width: 150,
      minWidth: 50,
      maxWidth: 170,
      resizable: true,
    },
    {
      field: "sub_last_user_agent",
      headerName: "Last App (Subscription)",
      width: 150,
      minWidth: 50,
      maxWidth: 150,
      resizable: true,
    },
    {
      headerName: "",
      field: "tools",
      type: "actions",
      width: 160,
      minWidth: 50,
      maxWidth: 160,
      resizable: true,
      getActions: (params: GridRowParams<AccountType>) => [
        <GridActionsCellItem
          key="paid"
          label="Paid"
          icon={helpers.RenderPayment(params.row.payed)}
          onClick={() => helpers.onPaymentClick(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          label="Delete"
          icon={helpers.RenderDeleteIcon(params.row)}
          onClick={() => helpers.onDeleteClick(params.row)}
        />,
        <GridActionsCellItem
          key="disable"
          label="disable"
          icon={helpers.RenderToggleIcon(params.row)}
          onClick={() => helpers.onDisableClick(params.row)}
        />,
        <GridActionsCellItem
          key="revoke"
          label="Revoke"
          icon={helpers.RenderRevokeIcon(params.row)}
          onClick={() => helpers.onRevokeClick(params.row)}
        />,
      ],
    },
  ];

  return (
    <BaseAccountGrid
      Accounts={props.Accounts}
      columnsFactory={(helpers) => buildColumns(helpers)}
      Loading={props.Loading}
      onDeleting={props.onDeleting}
      onRenewing={props.onRenewing}
      onDisabling={props.onDisabling}
      onPaying={props.onPaying}
      onRevoke={props.onRevoke}
    />
  );
});

GeneralAccountGrid.displayName = "GeneralAccountGrid";

export default GeneralAccountGrid;
