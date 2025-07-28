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
  useGridApiRef,
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
import AutoModeIcon from "@mui/icons-material/AutoMode";
import { Button, Checkbox } from "@mui/material";

import AccountType from "@/models/AccountType";
import { copyTextToClipboard } from "@/utils/Helper";
import QRModal from "./QRModal";
import Footer from "../General/Footer";
import Messages from "../General/Messages";

interface PropsType {
  Loading: boolean;
  Accounts: AccountType[];
  onDeleting: (account: AccountType) => void;
  onRenewing: (account: AccountType) => void;
  onDisabling: (account: AccountType) => void;
  onPaying: (accountId: string) => void;
  onRevoke: (account: AccountType) => void;
}
export interface GeneralAccountGridForwardRefHandle {
  SendBackUsernames: () => string[];
}

const label = { inputProps: { "aria-label": "Checkbox demo" } };

const GeneralAccountGrid = forwardRef<
  GeneralAccountGridForwardRefHandle,
  PropsType
>((props, ref) => {
  const [selectedLink, setSelectedLink] = useState("");
  const [accountIdsToPay, setAccountIdsToPay] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  type QRModalHandle = ElementRef<typeof QRModal>;
  const refQRModal = useRef<QRModalHandle>(null);

  type MessagesHandle = ElementRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  // استفاده از apiRef برای گرفتن ردیف‌های واقعی صفحه فعلی بعد از فیلتر و صفحه‌بندی
  const apiRef = useGridApiRef();

  const columns = [
    {
      headerClassName: "MUIGridHeader",
      headerName: "",
      field: "select",
      type: "actions",
      width: 30,
      renderHeader: () => (
        <Checkbox checked={selectAll} onChange={handleSelectAllChange} />
      ),
      getActions: (params: { row: AccountType }) => [
        <GridActionsCellItem
          key="checkPay"
          label="Check To Pay"
          icon={
            <Checkbox
              checked={selectedRows.has(params.row.id)}
              onChange={() => onCheckPay(params.row)}
            />
          }
        />,
      ],
    },
    {
      headerClassName: "MUIGridHeader",
      headerName: "",
      field: "toolbox",
      type: "actions",
      width: 160,
      minWidth: 50,
      maxWidth: 250,
      resizable: true,
      getActions: (params: { row: AccountType }) => [
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
      minWidth: 50,
      maxWidth: 160,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "note",
      headerName: "Note",
      width: 120,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "online",
      headerName: "",
      width: 10,
      resizable: true,
      renderCell: (params: GridRenderCellParams<AccountType, string>) =>
        RenderOnline(params.value),
      headerClassName: "MUIGridHeader",
    },
    {
      field: "online_at",
      headerName: "Online",
      width: 100,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
      renderCell: (params: GridRenderCellParams<AccountType, string>) =>
        RenderStatus(params.value),
      headerClassName: "MUIGridHeader",
    },
    {
      field: "package",
      headerName: "Package",
      width: 170,
      minWidth: 50,
      maxWidth: 170,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "price",
      headerName: "Price",
      width: 50,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "data_limit_string",
      headerName: "Limit",
      width: 90,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "used_traffic_string",
      headerName: "Usage",
      width: 140,
      minWidth: 50,
      maxWidth: 170,
      resizable: true,
      renderCell: (params: GridRenderCellParams<AccountType, string>) =>
        RenderUsage(params.row),
      headerClassName: "MUIGridHeader",
    },
    {
      field: "expire_string",
      headerName: "Expire",
      width: 110,
      minWidth: 50,
      maxWidth: 120,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },

    {
      field: "sub_updated_at",
      headerName: "Last Update (Subscription)",
      width: 150,
      minWidth: 50,
      maxWidth: 170,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "sub_last_user_agent",
      headerName: "Last App (Subscription)",
      width: 150,
      minWidth: 50,
      maxWidth: 150,
      resizable: true,
      headerClassName: "MUIGridHeader",
    },
    {
      headerName: "",
      field: "tools",
      type: "actions",
      width: 160,
      minWidth: 50,
      maxWidth: 160,
      resizable: true,
      headerClassName: "MUIGridHeader",
      getActions: (params: { row: AccountType }) => [
        <GridActionsCellItem
          key="paid"
          label="Paid"
          icon={RenderPayment(params.row.payed)}
          onClick={() => onPaymentClick(params.row)}
        />,
        <GridActionsCellItem
          key="delete"
          label="Delete"
          icon={
            <DeleteIcon className="text-danger" sx={{ fontSize: "25px" }} />
          }
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
        <GridActionsCellItem
          key="revoke"
          label="Revoke"
          icon={
            <AutoModeIcon className="text-warning " sx={{ fontSize: "25px" }} />
          }
          onClick={() => onRevoke(params.row)}
        />,
      ],
    },
  ];

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

  // اصلاح انتخاب همه با استفاده از apiRef و گرفتن ردیف‌های واقعی صفحه فعلی
  const handleSelectAllChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const isChecked = event.target.checked;
    setSelectAll(isChecked);

    // گرفتن همه آی‌دی‌ها
    const allRowIds = apiRef.current.getAllRowIds();

    // گرفتن ردیف‌های واقعی
    const allRows = allRowIds
      .map((id) => apiRef.current.getRow(id))
      .filter((row) => row !== undefined);

    // گرفتن مدل فیلتر فعال از گرید
    const filterModel = apiRef.current.state.filter.filterModel;

    // اعمال همه فیلترها و اپراتورها روی داده‌ها
    let filteredRows = allRows;
    filterModel.items.forEach((filter) => {
      if (filter.field && filter.operator) {
        filteredRows = filteredRows.filter((row) => {
          const cellValue = row[filter.field];
          const value = filter.value ?? "";

          switch (filter.operator) {
            case "contains":
              return cellValue?.toString().includes(value);
            case "equals":
              return cellValue?.toString() === value;
            case "startsWith":
              return cellValue?.toString().startsWith(value);
            case "endsWith":
              return cellValue?.toString().endsWith(value);
            case "isEmpty":
              return !cellValue || cellValue.toString().trim() === "";
            case "isNotEmpty":
              return cellValue && cellValue.toString().trim() !== "";
            case "isAnyOf":
              if (Array.isArray(value)) {
                return value.includes(cellValue?.toString());
              }
              return false;
            default:
              return true;
          }
        });
      }
    });

    // صفحه فعلی
    const start = page * pageSize;
    const end = start + pageSize;
    const currentPageRows = filteredRows.slice(start, end);
    const currentPageIds = currentPageRows.map((row) => row.id);

    const selectedCount = isChecked ? currentPageIds.length : 0;

    setSelectedRows(() => {
      if (isChecked) {
        return new Set(currentPageIds.map((id) => String(id)));
      } else {
        return new Set();
      }
    });

    setAccountIdsToPay(isChecked ? currentPageIds.map((id) => String(id)) : []);

    setTimeout(() => {
      if (refMessages.current) {
        if (isChecked && selectedCount > 0) {
          refMessages.current.Show(
            "success",
            `${selectedCount} accounts selected!`,
          );
        } else {
          refMessages.current.Show("info", "No accounts selected.");
        }
      }
    }, 0);
  };

  const onCheckPay = (account: AccountType) => {
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

  const onPaymentClick = (account: AccountType) => {
    props.onPaying(account.id);
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
      <span className="text-success ">
        <CreditScoreRoundedIcon
          sx={{ fontSize: "25px" }}
        ></CreditScoreRoundedIcon>
      </span>
    ) : (
      <span className="text-secondary">
        <CreditCardOffRoundedIcon
          sx={{ fontSize: "25px" }}
        ></CreditCardOffRoundedIcon>
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
      <Messages ref={refMessages}></Messages>
      <DataGrid
        apiRef={apiRef}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
        className="Grid"
        autoHeight
        rows={props.Accounts}
        columns={columns}
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
          "& .MuiDataGrid-columnHeaders": {
            cursor: "col-resize",
          },
        }}
        slotProps={{
          baseCheckbox: {
            indeterminate: false,
          },
        }}
      />
      <Footer />
      <QRModal ref={refQRModal} />
    </>
  );
});

GeneralAccountGrid.displayName = "GeneralAccountGrid";

export default GeneralAccountGrid;
