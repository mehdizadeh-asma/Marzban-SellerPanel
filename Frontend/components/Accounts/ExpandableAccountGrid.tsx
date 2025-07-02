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
import AutoModeIcon from "@mui/icons-material/AutoMode";

import AccountType from "@/models/AccountType";
import { copyTextToClipboard } from "@/utils/Helper";
import QRModal from "./QRModal";
import { Button, Checkbox } from "@mui/material";
import Footer from "../General/Footer";

interface PropsType {
  Loading: boolean;
  Accounts: AccountType[];
  onDeleting: (account: AccountType) => void;
  onRenewing: (account: AccountType) => void;
  onDisabling: (account: AccountType) => void;
  onPaying: (accountId: string) => void;
  onRevoke: (account: AccountType) => void;
}
export interface ExpandableGridForwardRefHandle {
  SendBackUsernames: () => string[];
}

interface GridRowData extends AccountType {
  isParent: boolean;
  isChecked: boolean;
}

const ExpandableAccountGrid = forwardRef<
  ExpandableGridForwardRefHandle,
  PropsType
>((props, ref) => {
  const [selectedLink, setSelectedLink] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [accountIdsToPay, setAccountIdsToPay] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  type QRModalHandle = ElementRef<typeof QRModal>;
  const refQRModal = useRef<QRModalHandle>(null);

  useImperativeHandle(ref, () => ({
    SendBackUsernames: () => {
      const accountsId = [...accountIdsToPay];
      setAccountIdsToPay([]);
      return accountsId;
    },
  }));

  const onRevoke = (account: AccountType) => {
    props.onRevoke(account);
  };
  const onCheckPay = (account: AccountType) => {
    // const tempAccount = account as GridRowData;
    // tempAccount.isChecked = !tempAccount.isChecked;
    if (account.id) {
      setSelectedRows((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(account.id)) newSet.delete(account.id);
        else newSet.add(account.id);
        return newSet;
      });
      setAccountIdsToPay((prevAccountIds) =>
        prevAccountIds.includes(account.id)
          ? prevAccountIds.filter((myid) => myid !== account.id)
          : [...prevAccountIds, account.id],
      );
    }
  };

  const columns = [
    {
      field: "toggle",
      headerName: "",
      headerClassName: "MUIGridHeader",
      width: 10,
      resizable: true,
      renderCell: (params: GridRenderCellParams<GridRowData, string>) => {
        const { username, isParent } = params.row;
        if (isParent) {
          return (
            <Button onClick={() => toggleRowExpansion(username)}>
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
      field: "select",
      type: "actions",
      width: 30,
      renderHeader: () => (
        <Checkbox checked={selectAll} onChange={handleSelectAllChange} />
      ),
      getActions: (params: { row: GridRowData }) => {
        const isParentRow = params.row.isParent;
        return isParentRow
          ? [
              <GridActionsCellItem
                key="checkPay"
                label="Check To Pay"
                icon={
                  <Checkbox
                    sx={{ fontSize: "25px" }}
                    checked={selectedRows.has(params.row.id)}
                    onChange={() => onCheckPay(params.row)}
                  />
                }
              />,
            ]
          : [
              <GridActionsCellItem
                key="revoke"
                label="Revoke"
                icon={
                  <AutoModeIcon
                    className="text-warning"
                    sx={{ fontSize: "25px" }}
                  />
                }
                onClick={() => onRevoke(params.row)}
              />,
            ];
      },
    },

    {
      headerClassName: "MUIGridHeader",
      headerName: "",
      field: "link",
      type: "actions",
      width: 110,
      getActions: (params: { row: GridRowData }) => {
        const isParentRow = params.row.isParent;

        return isParentRow
          ? [
              <GridActionsCellItem
                key="link"
                label="Link"
                icon={
                  params.row.username === selectedLink ? (
                    <CheckIcon className="text-primary " />
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
                      sx={{ fontSize: "28px" }}
                    />
                  ) : (
                    <ToggleOnIcon
                      sx={{ fontSize: "28px" }}
                      className="text-success "
                    />
                  )
                }
                onClick={() => {
                  onDisableAccount(params.row);
                }}
              />,
              <GridActionsCellItem
                key="delete"
                label="Delete"
                icon={
                  <DeleteIcon
                    sx={{ fontSize: "23px" }}
                    className="text-danger"
                  />
                }
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
      renderCell: (params: GridRenderCellParams<GridRowData, string>) => {
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
                {params.row.sub_last_user_agent
                  ? `${params.row.sub_last_user_agent}`
                  : "N/A"}
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
      renderCell: (params: GridRenderCellParams<GridRowData, string>) => {
        return params.row.isParent ? params.row.note : "";
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      headerClassName: "MUIGridHeader",
      renderCell: (params: GridRenderCellParams<GridRowData, string>) => {
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
                {params.row.sub_updated_at
                  ? `${params.row.sub_updated_at}`
                  : "N/A"}
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
      renderCell: (params: GridRenderCellParams<GridRowData, string>) => {
        return params.row.isParent ? RenderOnline(params.value) : "";
      },

      headerClassName: "MUIGridHeader",
    },
    {
      field: "used_traffic_string",
      headerName: "Usage",
      width: 180,
      headerClassName: "MUIGridHeader",
      renderCell: (params: GridRenderCellParams<GridRowData, string>) => {
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
                {params.row.online_at ? `${params.row.online_at}` : "N/A"}
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
      renderCell: (params: GridRenderCellParams<GridRowData, string>) => {
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
      field: "price",
      headerName: "Price",
      width: 60,
      headerClassName: "MUIGridHeader",
      renderCell: (params: GridRenderCellParams<GridRowData, string>) => {
        if (params.row.isParent) return params.value;
        return "";
        // } else {
        //   return (
        //     <Box display="flex" flexDirection="column" alignItems="center">
        //       <p style={{ margin: 0, fontWeight: "bold" }}>Price</p>
        //       <div
        //         style={{
        //           width: "100%",
        //           height: "1px",
        //           backgroundColor: "#ccc",
        //           margin: "4px 0",
        //         }}
        //       ></div>
        //       <p
        //         style={{
        //           margin: 0,
        //           textAlign: "center",
        //           wordWrap: "break-word",
        //           whiteSpace: "normal",
        //         }}
        //       >
        //         {params.row.price ? `${params.row.price}` : "N/A"}
        //       </p>
        //     </Box>
        //   );
        // }
      },
    },
  ];

  const accounts = Array.isArray(props.Accounts) ? props.Accounts : [];

  // ساختن آرایه rows برای DataGrid
  const rows: GridRowData[] = accounts.flatMap((account) => {
    const isExpanded = expandedRows.has(account.username);
    const parentRow: GridRowData = {
      ...account,
      isParent: true,
      isChecked: false,
    };
    const detailRow: GridRowData | null = isExpanded
      ? {
          ...account,
          id: `${account.id}-detail`,
          isParent: false,
          isChecked: false,
          username: account.username,
          price: account.price,
          sub_last_user_agent: account.sub_last_user_agent,
          sub_updated_at: account.sub_updated_at,
          package: account.package,
          online_at: account.online_at,
        }
      : null;
    return detailRow ? [parentRow, detailRow] : [parentRow];
  });

  const toggleRowExpansion = (username: string) => {
    setExpandedRows((prev) => {
      const updated = new Set(prev);
      if (updated.has(username)) updated.delete(username);
      else updated.add(username);
      return updated;
    });
  };

  const handleSelectAllChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const isChecked = event.target.checked;
    setSelectAll(isChecked);

    const currentPageParentIds = rows
      .filter((row) => row.isParent)
      .slice(page * pageSize, (page + 1) * pageSize)
      .map((row) => row.id);

    setSelectedRows(() => {
      if (isChecked) {
        return new Set(currentPageParentIds);
      } else {
        return new Set();
      }
    });

    setAccountIdsToPay(isChecked ? currentPageParentIds : []);
  };

  const onPaymentClick = (account: AccountType) => {
    const id = account.id.replace("-detail", "");
    props.onPaying(id);
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
        <CreditScoreRoundedIcon
          sx={{ fontSize: "20px" }}
        ></CreditScoreRoundedIcon>
      </span>
    ) : (
      <span className="text-secondary">
        <CreditCardOffRoundedIcon
          sx={{ fontSize: "20px" }}
        ></CreditCardOffRoundedIcon>
      </span>
    );
  };

  const RenderUsage = (account: AccountType) => {
    return (
      <Box sx={{ width: "100%" }}>
        {`${account.used_traffic_string} of ${account.data_limit / (1024 * 1024 * 1024)} GB`}
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
    <div>
      <QRModal ref={refQRModal}></QRModal>
      <DataGrid
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        className="Grid"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        loading={props.Loading}
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(model) => {
          setPage(model.page);
          setPageSize(model.pageSize);
        }}
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
        autoHeight
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
      <Footer></Footer>
    </div>
  );
});

ExpandableAccountGrid.displayName = "ExpandableAccountGrid";

export default ExpandableAccountGrid;
