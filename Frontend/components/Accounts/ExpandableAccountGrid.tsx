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
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";

import AccountType from "@/models/AccountType";
import { copyTextToClipboard } from "@/utils/Helper";
import QRModal from "./QRModal";
import { Button, Checkbox } from "@mui/material";

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

const ExpandableAccountGrid = forwardRef<ForwardRefHandle, PropsType>(
  (props, ref) => {
    const [selectedLink, setSelectedLink] = useState("");
    const [UsernamesToPay, setUsernamesToPay] = useState<string[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    type QRModalHandle = ElementRef<typeof QRModal>;
    const refQRModal = useRef<QRModalHandle>(null);

    useImperativeHandle(ref, () => ({
      SendBackUsernames: () => {
        return [...UsernamesToPay];
      },
    }));

    const columns = [
      {
        field: "toggle",
        headerName: "",
        headerClassName: "MUIGridHeader",
        width: 10,
        resizable: true,
        renderCell: (params: GridRenderCellParams<any, string>) => {
          const { username } = params.row;
          if (params.row.isParent) {
            return (
              <Button size="small" onClick={() => toggleRowExpansion(username)}>
                {expandedRows.has(username) ? (
                  <ExpandLessIcon className="text-danger"></ExpandLessIcon>
                ) : (
                  <ExpandMoreIcon className="text-info"></ExpandMoreIcon>
                )}
              </Button>
            );
          }
          return null;
        },
      },
      {
        headerClassName: "MUIGridHeader",
        headerName: "",
        field: "link",
        type: "actions",
        width: 160,
        getActions: (params: { row: any }) => {
          const isParentRow = params.row.isParent;

          return isParentRow
            ? [
                <GridActionsCellItem
                  key="checkPay"
                  label="Check To Pay"
                  icon={<Checkbox />}
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
                  onClick={() => {
                    console.log("params.row in qr", params.row);
                    onQRClick(params.row);
                  }}
                />,
                <GridActionsCellItem
                  key="renew"
                  label="Renew"
                  icon={<RenewIcon className="text-success" />}
                  onClick={() => onRenewClick(params.row)}
                />,
              ]
            : [
                <GridActionsCellItem
                  key="paid"
                  label="Paid"
                  icon={RenderPayment(params.row.payed)}
                  onClick={() => {
                    console.log("params.row.payed", params.row);
                    onPaymentClick(params.row);
                  }}
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
                  onClick={() => {
                    console.log("params.row in dis", params.row);
                    onDisableAccount(params.row);
                  }}
                />,
                <GridActionsCellItem
                  key="delete"
                  label="Delete"
                  icon={<DeleteIcon className="text-danger fontsize2rem" />}
                  onClick={() => onDeleteClick(params.row)}
                />,
              ];
        },
      },

      {
        field: "username",
        headerName: "Username",
        width: 150,
        minWidth: 50,
        maxWidth: 160,
        resizable: true,
        headerClassName: "MUIGridHeader",
        renderCell: (params: GridRenderCellParams<any, string>) => {
          if (params.row.isParent) {
            return params.row.username;
          } else {
            return (
              <Box display="flex" flexDirection="column" alignItems="center">
                <p
                  style={{
                    margin: 0,
                    fontWeight: "bold",
                    textAlign: "center",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  Last Application
                </p>
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#ccc",
                    margin: "4px 0",
                  }}
                ></div>
                <p
                  style={{
                    margin: 0,
                    textAlign: "center",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {params.row.lastapp ? `${params.row.lastapp}` : "N/A"}
                </p>
              </Box>
            );
          }
        },
      },

      {
        field: "note",
        headerName: "Note",
        width: 100,
        headerClassName: "MUIGridHeader",
        renderCell: (params: GridRenderCellParams<any, string>) => {
          return params.row.isParent ? params.row.note : "";
        },
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        headerClassName: "MUIGridHeader",
        renderCell: (params: GridRenderCellParams<any, string>) => {
          if (params.row.isParent) {
            return RenderStatus(params.value);
          } else {
            return (
              <Box display="flex" flexDirection="column" alignItems="center">
                <p
                  style={{
                    margin: 0,
                    fontWeight: "bold",
                    textAlign: "center",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  Last Update
                </p>
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#ccc",
                    margin: "4px 0",
                    textAlign: "center",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                ></div>
                <p
                  style={{
                    margin: 0,
                    textAlign: "center",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {params.row.lastUpdate ? `${params.row.lastUpdate}` : "N/A"}
                </p>
              </Box>
            );
          }
        },
      },
      {
        field: "online",
        headerName: "Online",
        width: 10,
        renderCell: (params: GridRenderCellParams<any, string>) => {
          return params.row.isParent ? RenderOnline(params.value) : "";
        },

        headerClassName: "MUIGridHeader",
      },
      {
        field: "used_traffic_string",
        headerName: "Usage",
        width: 140,
        headerClassName: "MUIGridHeader",
        renderCell: (params: GridRenderCellParams<any, string>) => {
          if (params.row.isParent) {
            return RenderUsage(params.row);
          } else {
            return (
              <Box display="flex" flexDirection="column" alignItems="center">
                <p style={{ margin: 0, fontWeight: "bold" }}>Last Online</p>
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#ccc",
                    margin: "4px 0",
                  }}
                ></div>
                <p
                  style={{
                    margin: 0,
                    textAlign: "center",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {params.row.lastonline ? `${params.row.lastonline}` : "N/A"}
                </p>
              </Box>
            );
          }
        },
      },
      {
        field: "expire_string",
        headerName: "Expire",
        width: 110,
        headerClassName: "MUIGridHeader",
        renderCell: (params: GridRenderCellParams<any, string>) => {
          if (params.row.isParent) {
            return params.value;
          } else {
            return (
              <Box display="flex" flexDirection="column" alignItems="center">
                <p style={{ margin: 0, fontWeight: "bold" }}>Package</p>
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#ccc",
                    margin: "4px 0",
                  }}
                ></div>
                <p
                  style={{
                    margin: 0,
                    textAlign: "center",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {params.row.package ? `${params.row.package}` : "N/A"}
                </p>
              </Box>
            );
          }
        },
      },
      {
        field: "data_limit_string",
        headerName: "Limit",
        width: 90,
        headerClassName: "MUIGridHeader",
        renderCell: (params: GridRenderCellParams<any, string>) => {
          if (params.row.isParent) {
            return params.value;
          } else {
            return (
              <Box display="flex" flexDirection="column" alignItems="center">
                <p style={{ margin: 0, fontWeight: "bold" }}>Price</p>
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#ccc",
                    margin: "4px 0",
                  }}
                ></div>
                <p
                  style={{
                    margin: 0,
                    textAlign: "center",
                    wordWrap: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  {params.row.price ? `${params.row.price}` : "N/A"}
                </p>
              </Box>
            );
          }
        },
      },
    ];

    const rows = props.Accounts.flatMap((account) => {
      const isExpanded = expandedRows.has(account.username);
      return [
        { ...account, isParent: true },
        isExpanded
          ? {
              ...account,
              id: `${account.id}-detail`,
              isParent: false,
              username: account.username,
              price: account.price,
              lastapp: account.sub_last_user_agent,
              lastUpdate: account.sub_updated_at,
              package: account.package,
              lastonline: account.online_at,
            }
          : null,
      ].filter(Boolean);
    });

    const toggleRowExpansion = (username: string) => {
      setExpandedRows((prev) => {
        const updated = new Set(prev);
        if (updated.has(username)) updated.delete(username);
        else updated.add(username);

        return updated;
      });
    };
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
      console.log("m in payment", account);
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
      console.log("status", status);
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
        </span>
      ) : (
        <span className="text-secondary">
          <CreditCardOffRoundedIcon></CreditCardOffRoundedIcon>
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
      <div className=" bg-info  ">
        <QRModal ref={refQRModal}></QRModal>
        <DataGrid
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          className="Grid"
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id || row.username}
          loading={props.Loading}
          slots={{
            toolbar: () => (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 1,
                }}
              >
                <GridToolbarFilterButton />
                <GridToolbarColumnsButton />
              </Box>
            ),
          }}
          sortingOrder={["asc", "desc"]}
          getRowClassName={(params) =>
            params.row.id.includes("-detail") ? "expanded-row" : ""
          }
          // autoHeight
          getRowHeight={(params) =>
            params.id.toString().includes("-detail") ? 100 : null
          }
          sx={{
            boxShadow: 2,
            border: 2,
            borderColor: "purple",

            "& .MuiDataGrid-row:hover": {
              backgroundColor: "lightgray",
              color: "purple",
              fontWeight: "bold",
            },
            "& .expanded-row": {
              backgroundColor: "#fffaeb !important",
            },
            "& .MuiDataGrid-cell": {
              textAlign: "center",
            },
          }}
        />
      </div>
    );
  },
);

ExpandableAccountGrid.displayName = "ExpandableAccountGrid";

export default ExpandableAccountGrid;
