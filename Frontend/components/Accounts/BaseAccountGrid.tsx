"use client";
import React, {
  ComponentRef,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { DataGrid, useGridApiRef, GridColDef } from "@mui/x-data-grid";
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
  RenderSelectCheckbox: (row: any) => React.ReactElement;
  RenderRevokeIcon: (row: any) => React.ReactElement;
  RenderLinkIcon: (row: any) => React.ReactElement;
  RenderToggleIcon: (row: any) => React.ReactElement;
  RenderQRIcon: (row: any) => React.ReactElement;
  RenderRenewIcon: (row: any) => React.ReactElement;
  RenderDeleteIcon: (row: any) => React.ReactElement;
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
}

export interface BaseGridHandle {
  SendBackUsernames: () => string[];
}

const BaseAccountGrid = forwardRef<BaseGridHandle, Props>((props, ref) => {
  const {
    Accounts: Accounts,
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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [accountIdsToPay, setAccountIdsToPay] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useImperativeHandle(ref, () => ({
    SendBackUsernames: () => {
      const accountsId = [...accountIdsToPay];
      setAccountIdsToPay([]);
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
    setAccountIdsToPay((prev) =>
      prev.includes(account.id)
        ? prev.filter((id) => id !== account.id)
        : [...prev, account.id],
    );
  };

  const onSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setSelectAll(isChecked);

    const api = apiRef.current;
    if (!api) return;

    let visibleSortedIds: string[] = [];
    try {
      if (typeof api.getAllRowIds === "function") {
        visibleSortedIds = api.getAllRowIds().map(String);
      } else if (typeof api.getRowModels === "function") {
        visibleSortedIds = Array.from(
          (api.getRowModels() as Map<any, any>).keys(),
        ).map(String);
      } else if ((api.state as any)?.rows?.filteredSortedRowIds) {
        visibleSortedIds = (api.state as any).rows.filteredSortedRowIds.map(
          String,
        );
      }
    } catch (e) {
      visibleSortedIds = [];
    }

    if (!visibleSortedIds || visibleSortedIds.length === 0) {
      try {
        visibleSortedIds = api.getAllRowIds
          ? (api.getAllRowIds() as any[]).map(String)
          : [];
      } catch (e) {
        visibleSortedIds = [];
      }
    }

    const start = page * pageSize;
    const end = start + pageSize;
    const pageIds = visibleSortedIds.slice(start, end);

    const currentPageParentIds = pageIds
      .map((id) => {
        try {
          const row = api.getRow ? api.getRow(id) : undefined;
          if (!row) return null;
          if (typeof row.isParent !== "undefined")
            return row.isParent ? String(row.id) : null;
          return String(row.id);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];

    if (isChecked) {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        currentPageParentIds.forEach((id) => next.add(id));
        return next;
      });
      setAccountIdsToPay((prev) => {
        const next = new Set(prev);
        currentPageParentIds.forEach((id) => next.add(id));
        return Array.from(next);
      });
    } else {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        currentPageParentIds.forEach((id) => next.delete(id));
        return next;
      });
      setAccountIdsToPay((prev) =>
        prev.filter((id) => !currentPageParentIds.includes(id)),
      );
    }

    const selectedCount = isChecked ? currentPageParentIds.length : 0;
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
    onRevokeClick: (account: AccountType) =>
      onRevoke ? onRevoke(account) : undefined,
    onPaymentClick: (account: AccountType) =>
      onPaying ? onPaying(account.id) : undefined,
    RenderOnline,
    RenderStatus,
    RenderPayment,
    RenderUsage,
    onCopyLink: (account: AccountType) => {
      copyTextToClipboard(account.subscription_url);
      setSelectedLink(account.username);
    },
    onRenewClick: (account: AccountType) =>
      onRenewing ? onRenewing(account) : undefined,
    onQRClick: (account: AccountType) =>
      refQRModal.current?.Show(account.subscription_url, account.username),
    onDeleteClick: (account: AccountType) => {
      onDeleting ? onDeleting(account) : undefined;
    },
    onDisableClick: (account: AccountType) =>
      onDisabling ? onDisabling(account) : undefined,
    RenderSelectHeader: () => (
      <Checkbox checked={selectAll} onChange={onSelectAll} />
    ),
    RenderSelectCheckbox: (row: any) => (
      <Checkbox
        sx={{ fontSize: "25px" }}
        checked={selectedRows.has(String(row?.id))}
        onChange={() => onCheckClick(row)}
      />
    ),
    RenderRevokeIcon: (row: any) => (
      <AutoModeIcon className="text-warning" sx={{ fontSize: "25px" }} />
    ),
    RenderLinkIcon: (row: any) =>
      row?.username === selectedLink ? (
        <CheckIcon className="text-primary" />
      ) : (
        <LinkIcon className="text-primary" />
      ),
    RenderToggleIcon: (row: any) =>
      row?.status === "disabled" ? (
        <ToggleOffIcon sx={{ fontSize: "30px" }} className="text-secondry" />
      ) : (
        <ToggleOnIcon sx={{ fontSize: "30px" }} className="text-success" />
      ),
    RenderQRIcon: (row: any) => <QrCode2Icon className="text-primary" />,
    RenderRenewIcon: (row: any) => <RenewIcon className="text-success" />,
    RenderDeleteIcon: (row: any) => (
      <DeleteIcon sx={{ fontSize: "25px" }} className="text-danger" />
    ),
  };

  const existingSx = (dataGridProps as any)?.sx ?? {};
  const mergedSx = {
    ...(existingSx as any),
    ...({
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
    } as any),
  };
  const dataGridPropsWithoutSx = { ...(dataGridProps as any) };
  if (dataGridPropsWithoutSx.sx) delete dataGridPropsWithoutSx.sx;

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
        {...(dataGridPropsWithoutSx as any)}
      />
      <Footer></Footer>
    </>
  );
});

BaseAccountGrid.displayName = "BaseAccountGrid";

export default BaseAccountGrid;
