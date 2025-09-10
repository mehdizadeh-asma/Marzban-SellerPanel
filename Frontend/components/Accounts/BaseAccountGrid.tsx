"use client";
import React, {
  ComponentRef,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  DataGrid,
  useGridApiRef,
  GridColDef,
  gridFilteredSortedRowIdsSelector,
  GridValidRowModel,
  GridRowIdGetter,
  GridRowClassNameParams,
  GridRowHeightParams,
  GridRowHeightReturnValue,
} from "@mui/x-data-grid";
import type { SxProps, Theme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import CreditScoreRoundedIcon from "@mui/icons-material/CreditScoreRounded";
import CreditCardOffRoundedIcon from "@mui/icons-material/CreditCardOffRounded";
import GppMaybeRoundedIcon from "@mui/icons-material/GppMaybeRounded";
import GppGoodRoundedIcon from "@mui/icons-material/GppGoodRounded";
import GppBadRoundedIcon from "@mui/icons-material/GppBadRounded";
import WatchLaterIcon from "@mui/icons-material/WatchLater";
import SafetyCheckRoundedIcon from "@mui/icons-material/SafetyCheckRounded";
import AutoModeIcon from "@mui/icons-material/AutoMode";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import RenewIcon from "@mui/icons-material/RecyclingOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import LinearProgress from "@mui/material/LinearProgress";
import AccountType from "@/models/AccountType";
import LinkIcon from "@mui/icons-material/Link";
import CheckIcon from "@mui/icons-material/Check";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";

import Messages from "../General/Messages";
import QRModal from "./QRModal";
import Footer from "../General/Footer";
import { copyTextToClipboard } from "@/utils/Helper";

export interface BaseGridHelpers {
  onRevokeClick: (account: AccountType) => void;
  onPaymentClick: (account: AccountType) => void;
  onRenewClick: (account: AccountType) => void;
  onDeleteClick: (account: AccountType) => void;
  onDisableClick: (account: AccountType) => void;
  RenderOnline: (online?: string) => React.ReactNode;
  RenderStatus: (status?: string) => React.ReactNode;
  RenderPayment: (payment?: string) => React.ReactElement;
  RenderUsage: (account: AccountType) => React.ReactNode;
  onCopyLink: (account: AccountType) => void;
  onQRClick: (account: AccountType) => void;
  RenderSelectHeader: () => React.ReactElement;
  RenderSelectCheckbox: (row: AccountType) => React.ReactElement;
  RenderRevokeIcon: (row: AccountType) => React.ReactElement;
  RenderLinkIcon: (row: AccountType) => React.ReactElement;
  RenderToggleIcon: (row: AccountType) => React.ReactElement;
  RenderQRIcon: (row: AccountType) => React.ReactElement;
  RenderRenewIcon: (row: AccountType) => React.ReactElement;
  RenderDeleteIcon: (row: AccountType) => React.ReactElement;
}

interface Props {
  Accounts: AccountType[];
  columnsFactory: (helpers: BaseGridHelpers) => GridColDef[];
  Loading: boolean;
  onDeleting?: (account: AccountType) => void;
  onRenewing?: (account: AccountType) => void;
  onDisabling?: (account: AccountType) => void;
  onPaying?: (accountId: string) => void;
  onRevoke?: (account: AccountType) => void;
  dataGridProps?: Partial<React.ComponentProps<typeof DataGrid>>;
  hasDetailRows?: boolean;
}

export interface BaseGridHandle {
  SendBackUsernames: () => string[];
}

const BaseAccountGrid = forwardRef<BaseGridHandle, Props>((props, ref) => {
  const {
    Accounts,
    columnsFactory,
    Loading: loading = false,
    dataGridProps,
    onDeleting,
    onRenewing,
    onDisabling,
    onPaying,
    onRevoke,
  } = props;

  const apiRef = useGridApiRef();
  const refMessages = useRef<ComponentRef<typeof Messages>>(null);
  const refQRModal = useRef<ComponentRef<typeof QRModal>>(null);
  const [selectedLink, setSelectedLink] = useState<string>("");
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useImperativeHandle(ref, () => ({
    SendBackUsernames: () => {
      const accountsId = Array.from(selectedRows);
      setSelectedRows(new Set());
      setSelectAll(false);
      return accountsId;
    },
  }));

  const RenderOnline = (online?: string) => {
    const Dot = ({ color }: { color: string }) => (
      <Box
        component="span"
        sx={{
          display: "inline-block",
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: color,
          verticalAlign: "middle",
          border: "2px solid rgba(0,0,0,0.05)",
        }}
      />
    );
    let dot: React.ReactNode = null;

    switch (online) {
      case "Online":
        dot = <Dot color="#28a745" />;
        break;
      case "Offline":
        dot = <Dot color="#dc3545" />;
        break;
      case "Never":
        dot = <Dot color="#ffc107" />;
        break;
      default:
        dot = null;
    }
    return (
      <Box
        component="span"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        {dot}
      </Box>
    );
  };

  const RenderStatus = (status?: string) => {
    const iconSx = { verticalAlign: "middle", fontSize: 20, mr: 0.5 };
    let color: string | undefined;
    let label: string | undefined;
    let IconElem: React.ReactElement | null = null;

    switch (status) {
      case "active":
        color = "#28a745";
        label = "Active";
        IconElem = <GppGoodRoundedIcon sx={iconSx} />;
        break;
      case "on_hold":
        color = "#6f42c1";
        label = "On Hold";
        IconElem = <WatchLaterIcon sx={iconSx} />;
        break;
      case "disabled":
        color = "#9e9e9e";
        label = "Disabled";
        IconElem = <GppBadRoundedIcon sx={iconSx} />;
        break;
      case "expired":
        color = "#0d6efd";
        label = "Expired";
        IconElem = <SafetyCheckRoundedIcon sx={iconSx} />;
        break;
      case "limited":
        color = "#dc3545";
        label = "Limited";
        IconElem = <GppMaybeRoundedIcon sx={iconSx} />;
        break;
      default:
        IconElem = null;
        label = undefined;
        color = undefined;
    }

    return (
      <Box
        component="span"
        sx={{
          color: color,
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        {IconElem}
        {label ? <Box component="span">{label}</Box> : null}
      </Box>
    );
  };

  const RenderPayment = (payment: string | undefined) => {
    return payment === "Paid" ? (
      <span className="text-success">
        <CreditScoreRoundedIcon sx={{ fontSize: "25px" }} />
      </span>
    ) : (
      <span className="text-secondary">
        <CreditCardOffRoundedIcon sx={{ fontSize: "25px" }} />
      </span>
    );
  };

  const RenderUsage = (account: AccountType) => {
    const totalGb =
      typeof account.data_limit === "number" && account.data_limit > 0
        ? account.data_limit / (1024 * 1024 * 1024)
        : 0;
    const totalGbLabel = totalGb ? `${Number(totalGb.toFixed(2))} GB` : "N/A";

    const progressValue =
      typeof account.data_limit === "number" && account.data_limit > 0
        ? (account.used_traffic / account.data_limit) * 100
        : 0;

    return (
      <Box
        sx={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          width: "100%",
          padding: 0,
          margin: 0,
          textAlign: "center",
        }}
      >
        <Box
          sx={{ lineHeight: 1 }}
        >{`${account.used_traffic_string} of ${totalGbLabel}`}</Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(Math.max(progressValue, 0), 100)}
          sx={{ width: "90%", height: 6, borderRadius: 1 }}
        />
      </Box>
    );
  };

  const onCheckClick = (account: AccountType) => {
    if (!account?.id) return;
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(account.id)) newSet.delete(account.id);
      else newSet.add(account.id);
      return newSet;
    });
  };

  const onSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setSelectAll(isChecked);
    let selectedCount = 0;

    if (isChecked) {
      const api = apiRef.current;
      if (!api) return;

      let visibleSortedIds: string[] = [];
      try {
        if (typeof gridFilteredSortedRowIdsSelector === "function") {
          const ids = gridFilteredSortedRowIdsSelector(apiRef);
          if (Array.isArray(ids) && ids.length) {
            visibleSortedIds = ids.map(String);
          }
        }
      } catch {
        visibleSortedIds = [];
      }

      if (!visibleSortedIds || visibleSortedIds.length === 0) {
        try {
          visibleSortedIds =
            typeof api.getAllRowIds === "function"
              ? (api.getAllRowIds() ?? []).map(String)
              : [];
        } catch {
          visibleSortedIds = [];
        }
      }

      const start = page * pageSize;
      const end = start + pageSize;
      const pageIds = visibleSortedIds.slice(start, end);

      const currentPageParentIds = pageIds
        .map((id) => {
          try {
            const row =
              typeof api.getRow === "function" ? api.getRow(id) : undefined;
            if (!row) return null;
            const r = row as GridValidRowModel & {
              isParent?: boolean;
              id?: string | number;
            };
            if (typeof r.isParent !== "undefined") {
              return r.isParent ? String(r.id) : null;
            }
            return String(r.id);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as string[];

      const selectedIds = new Set<string>();
      currentPageParentIds.forEach((id) => selectedIds.add(id));
      setSelectedRows(selectedIds);
      selectedCount = isChecked ? currentPageParentIds.length : 0;
    } else {
      setSelectedRows(new Set());
    }

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

  const helpers: BaseGridHelpers = {
    onRevokeClick: (account: AccountType) => onRevoke?.(account),
    onPaymentClick: (account: AccountType) =>
      onPaying?.(
        account.id.includes("-detail")
          ? account.id.replace("-detail", "")
          : account.id,
      ),

    RenderOnline,
    RenderStatus,
    RenderPayment,
    RenderUsage,
    onCopyLink: (account: AccountType) => {
      copyTextToClipboard(account.subscription_url);
      setSelectedLink(account.username);
    },
    onRenewClick: (account: AccountType) => onRenewing?.(account),
    onQRClick: (account: AccountType) =>
      refQRModal.current?.Show(account.subscription_url, account.username),
    onDeleteClick: (account: AccountType) => onDeleting?.(account),
    onDisableClick: (account: AccountType) => onDisabling?.(account),
    RenderSelectHeader: () => (
      <Checkbox checked={selectAll} onChange={onSelectAll} />
    ),
    RenderSelectCheckbox: (row: AccountType) => (
      <Checkbox
        sx={{ fontSize: "25px" }}
        checked={selectedRows.has(String(row?.id))}
        onChange={() => onCheckClick(row)}
      />
    ),
    RenderRevokeIcon: (_row: AccountType) => (
      <AutoModeIcon className="text-warning" sx={{ fontSize: "25px" }} />
    ),
    RenderLinkIcon: (row: AccountType) =>
      row?.username === selectedLink ? (
        <CheckIcon className="text-primary" />
      ) : (
        <LinkIcon className="text-primary" />
      ),
    RenderToggleIcon: (row: AccountType) =>
      row?.status === "disabled" ? (
        <ToggleOffIcon sx={{ fontSize: "30px" }} className="text-secondary" />
      ) : (
        <ToggleOnIcon sx={{ fontSize: "30px" }} className="text-success" />
      ),
    RenderQRIcon: (row: AccountType) => (
      <QrCode2Icon
        className="text-primary"
        sx={{ fontSize: "25px", cursor: "pointer" }}
        onClick={() =>
          refQRModal.current?.Show(row.subscription_url, row.username)
        }
      />
    ),
    RenderRenewIcon: (row: AccountType) => (
      <RenewIcon
        className="text-success"
        sx={{ fontSize: "25px", cursor: "pointer" }}
        onClick={() => onRenewing?.(row)}
      />
    ),
    RenderDeleteIcon: (row: AccountType) => (
      <DeleteIcon
        className="text-danger"
        sx={{ fontSize: "25px", cursor: "pointer" }}
        onClick={() => onDeleting?.(row)}
      />
    ),
  };

  const existingSx: SxProps<Theme> | undefined = dataGridProps?.sx;
  const customSx = {
    "& .MuiDataGrid-cell": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    "& .MuiDataGrid-columnHeader": {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    },
  };
  const mergedSx: SxProps<Theme> = (
    Array.isArray(existingSx)
      ? [...existingSx, customSx]
      : [existingSx ?? {}, customSx]
  ) as SxProps<Theme>;

  const { sx: _sx, ...dataGridPropsWithoutSx } = dataGridProps ?? {};

  const injectedRowHelpers: Partial<React.ComponentProps<typeof DataGrid>> = {};
  if (props.hasDetailRows) {
    const getRowIdTyped: GridRowIdGetter<GridValidRowModel> = (row) =>
      String(row.id);
    const getRowClassNameTyped = (
      params: GridRowClassNameParams<GridValidRowModel>,
    ) => (String(params.row.id).includes("-detail") ? "expanded-row" : "");
    const getRowHeightTyped = (
      params: GridRowHeightParams,
    ): GridRowHeightReturnValue =>
      String(params.id).includes("-detail") ? 100 : undefined;

    injectedRowHelpers.getRowId = getRowIdTyped;
    injectedRowHelpers.getRowClassName = getRowClassNameTyped;
    injectedRowHelpers.getRowHeight = getRowHeightTyped;
  }

  const columns = columnsFactory(helpers);

  return (
    <>
      <Messages ref={refMessages} />
      <QRModal ref={refQRModal} />
      <DataGrid
        className="marzban-data-grid"
        rows={Accounts}
        columns={columns}
        apiRef={apiRef}
        loading={loading}
        pageSizeOptions={[10, 25, 50, 100]}
        paginationModel={{ page, pageSize }}
        onPaginationModelChange={(model) => {
          setPage(model.page);
          setPageSize(model.pageSize);
        }}
        initialState={{
          pagination: { paginationModel: { pageSize: pageSize } },
        }}
        sortingOrder={["asc", "desc"]}
        sx={mergedSx}
        {...(injectedRowHelpers as Partial<
          React.ComponentProps<typeof DataGrid>
        >)}
        {...(dataGridPropsWithoutSx as Partial<
          React.ComponentProps<typeof DataGrid>
        >)}
        getRowHeight={(params) =>
          String(params.id).includes("-detail") ? 100 : undefined
        }
      />
      <Footer></Footer>
    </>
  );
});

BaseAccountGrid.displayName = "BaseAccountGrid";

export default BaseAccountGrid;
