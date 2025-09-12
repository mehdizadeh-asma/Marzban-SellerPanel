"use client";
import { forwardRef, useState } from "react";

import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Typography, Button } from "@mui/material";
import {
  GridColDef,
  GridActionsCellItem,
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
interface GridRowData extends AccountType {
  isParent: boolean;
  isChecked: boolean;
}

const ExpandableAccountGrid = forwardRef<BaseGridHandle, PropsType>(
  function ExpandableAccountGrid(props, ref) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRowExpansion = (username: string) => {
      setExpandedRows((prev) => {
        const updated = new Set(prev);
        if (updated.has(username)) updated.delete(username);
        else updated.add(username);
        return updated;
      });
    };

    const buildColumns = (helpers: BaseGridHelpers): GridColDef[] => [
      {
        field: "toggle",
        headerName: "",
        width: 50,
        renderCell: (params: GridRenderCellParams<GridRowData, unknown>) => {
          const r = params.row;
          if (r.isParent) {
            return (
              <Button onClick={() => toggleRowExpansion(r.username)}>
                {expandedRows.has(r.username) ? (
                  <ExpandLessIcon className="text-danger" />
                ) : (
                  <ExpandMoreIcon className="text-info" />
                )}
              </Button>
            );
          }
          return null;
        },
      },
      {
        field: "select",
        type: "actions",
        width: 50,
        renderHeader: () => helpers.RenderSelectHeader(),
        getActions: (params: GridRowParams<GridRowData>) => {
          const isParentRow = params.row.isParent;
          return isParentRow
            ? [
                <GridActionsCellItem
                  key="checkPay"
                  label="Check To Pay"
                  icon={helpers.RenderSelectCheckbox(params.row)}
                />,
              ]
            : [
                <GridActionsCellItem
                  key="revoke"
                  label="Revoke"
                  icon={helpers.RenderRevokeIcon(params.row)}
                  onClick={() => helpers.onRevokeClick(params.row)}
                />,
              ];
        },
      },
      {
        headerName: "",
        field: "link",
        type: "actions",
        width: 110,
        getActions: (params: GridRowParams<GridRowData>) => {
          const isParentRow = params.row.isParent;
          return isParentRow
            ? [
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
              ]
            : [
                <GridActionsCellItem
                  key="paid"
                  label="Paid"
                  icon={helpers.RenderPayment(params.row.payed)}
                  onClick={() => helpers.onPaymentClick(params.row)}
                />,
                <GridActionsCellItem
                  key="disable"
                  label="disable"
                  icon={helpers.RenderToggleIcon(params.row)}
                  onClick={() => helpers.onDisableClick(params.row)}
                />,
                <GridActionsCellItem
                  key="delete"
                  label="Delete"
                  icon={helpers.RenderDeleteIcon(params.row)}
                  onClick={() => helpers.onDeleteClick(params.row)}
                />,
              ];
        },
      },
      {
        field: "username",
        headerName: "Username",
        width: 160,
        resizable: true,
        renderCell: (params: GridRenderCellParams<GridRowData, string | undefined>) => {
          const r = params.row;
          if (r.isParent) return <span>{params.value}</span>;
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                height: "100%",
                textAlign: "center",
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Last Application
                </Typography>
                <Typography variant="body2">{r.sub_last_user_agent}</Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "note",
        headerName: "Note",
        width: 160,
        resizable: true,
        renderCell: (params: GridRenderCellParams<GridRowData, unknown>) => {
          if (params.row.isParent) return <span>{String(params.value)}</span>;
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                height: "100%",
                textAlign: "center",
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Last Update
                </Typography>
                <Typography variant="body2">{params.row.sub_updated_at}</Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        resizable: true,
        renderCell: (params: GridRenderCellParams<GridRowData, string | undefined>) => {
          if (params.row.isParent) return helpers.RenderStatus(params.value);
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                height: "100%",
                textAlign: "center",
                paddingLeft: "5px",
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Package
                </Typography>
                <Typography variant="body2">{params.row.package}</Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "online",
        headerName: "",
        width: 50,
        renderCell: (params: GridRenderCellParams<GridRowData, string | undefined>) =>
          params.row.isParent ? helpers.RenderOnline(params.value) : "",
      },
      {
        field: "used_traffic_string",
        headerName: "Usage",
        width: 150,
        resizable: true,
        renderCell: (params: GridRenderCellParams<GridRowData, unknown>) => {
          if (params.row.isParent) return helpers.RenderUsage(params.row);
          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                height: "100%",
                textAlign: "center",
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Last Online
                </Typography>
                <Typography variant="body2">{params.row.online_at}</Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "expire_string",
        headerName: "Expire",
        width: 100,
        resizable: true,
        renderCell: (params: GridRenderCellParams<GridRowData, unknown>) =>
          params.row.isParent ? <span>{String(params.value)}</span> : "",
      },
      {
        field: "price",
        headerName: "Price",
        width: 80,
        resizable: true,
        renderCell: (params: GridRenderCellParams<GridRowData, number | string | undefined>) =>
          params.row.isParent ? params.value : "",
      },
    ];

    const accounts = Array.isArray(props.Accounts) ? props.Accounts : [];
    const rows: GridRowData[] = accounts.flatMap((account) => {
      const isExpanded = expandedRows.has(account.username);
      const parentRow: GridRowData = {
        ...account,
        id: String(account.id),
        isParent: true,
        isChecked: false,
      };
      const detailRow: GridRowData | null = isExpanded
        ? {
            ...account,
            id: `${account.id}-detail`,
            isParent: false,
            isChecked: false,
          }
        : null;
      return detailRow ? [parentRow, detailRow] : [parentRow];
    });

    return (
      <BaseAccountGrid
        ref={ref}
        Accounts={rows}
        columnsFactory={(helpers) =>
          buildColumns({
            ...helpers,
          })
        }
        Loading={props.Loading}
        hasDetailRows
        dataGridProps={{
          autoHeight: true,
        }}
        onDeleting={props.onDeleting}
        onRenewing={props.onRenewing}
        onDisabling={props.onDisabling}
        onPaying={props.onPaying}
        onRevoke={props.onRevoke}
      />
    );
  },
);

ExpandableAccountGrid.displayName = "ExpandableAccountGrid";

export default ExpandableAccountGrid;
