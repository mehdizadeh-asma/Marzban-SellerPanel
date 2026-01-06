import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import AssignInboundIcon from "@mui/icons-material/AccountTree";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import type { GridActionsCellItemProps, GridColDef } from "@mui/x-data-grid";
import { GridActionsCellItem } from "@mui/x-data-grid";

import type TariffType from "@/models/TariffType";

import dynamic from "next/dynamic";
import DataGridShell from "../General/DataGridShell";
import Footer from "../General/Footer";

const TariffInboundModal = dynamic(() => import("./TariffInboundModal"));

interface PropsType {
  Loading: boolean;
  Tariffs: TariffType[];
  onDisableAccount: (tariff: TariffType) => void;
  onFreeChanged: (tariff: TariffType) => void;
  onMessage: (messageType: string, message: string) => void;
}

export default function TariffGrid(props: PropsType): ReactElement | null {
  const { onDisableAccount: handleDisable, onFreeChanged: handleFreeChanged, onMessage } = props;
  const [isTariffInboundModalOpen, setIsTariffInboundModalOpen] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<TariffType>();

  const onDisableAccount = useCallback(
    (tariff: TariffType): void => {
      handleDisable(tariff);
    },
    [handleDisable],
  );
  const onFreeEnable = useCallback(
    (tariff: TariffType): void => {
      handleFreeChanged(tariff);
    },
    [handleFreeChanged],
  );
  const onAssignInboundClick = useCallback((tariff: TariffType): void => {
    setSelectedTariff(tariff);
  }, []);

  const columns: GridColDef<TariffType>[] = useMemo(
    () => [
      {
        field: "Title",
        headerName: "Title",
        width: 200,
        headerClassName: "MUIGridHeader",
      },
      {
        field: "Duration",
        headerName: "Duration(Days)",
        width: 120,
        headerClassName: "MUIGridHeader",
      },
      {
        field: "DataLimit",
        headerName: "DataLimit(GB)",
        width: 100,
        headerClassName: "MUIGridHeader",
      },
      {
        field: "Price",
        headerName: "Price(IRT)",
        width: 80,
        headerClassName: "MUIGridHeader",
      },
      {
        headerName: "Free",
        field: "free",
        type: "actions",
        width: 80,
        headerClassName: "MUIGridHeader",
        getActions: (params: {
          row: TariffType;
        }): readonly ReactElement<GridActionsCellItemProps>[] => [
          <GridActionsCellItem
            key="free"
            label="Free"
            icon={
              params.row.IsFree ? (
                <ToggleOnIcon sx={{ fontSize: "35px" }} className="text-success " />
              ) : (
                <ToggleOffIcon className="text-secondry " sx={{ fontSize: "35px" }} />
              )
            }
            onClick={() => onFreeEnable(params.row)}
          />,
        ],
      },

      {
        headerClassName: "MUIGridHeader",
        headerName: "Inbounds",
        field: "AssignInbounds",
        type: "actions",
        width: 120,
        getActions: (params: {
          row: TariffType;
        }): readonly ReactElement<GridActionsCellItemProps>[] => [
          <GridActionsCellItem
            key="AssignInbounds"
            label="AssignInbounds"
            icon={<AssignInboundIcon className="text-info" />}
            onClick={() => onAssignInboundClick(params.row)}
          />,
        ],
      },
      {
        headerName: "Active",
        field: "active",
        type: "actions",
        width: 100,
        headerClassName: "MUIGridHeader",
        getActions: (params: {
          row: TariffType;
        }): readonly ReactElement<GridActionsCellItemProps>[] => [
          <GridActionsCellItem
            key="active"
            label="Active"
            icon={
              params.row.IsVisible ? (
                <ToggleOnIcon sx={{ fontSize: "35px" }} className="text-success " />
              ) : (
                <ToggleOffIcon className="text-secondry " sx={{ fontSize: "35px" }} />
              )
            }
            onClick={() => onDisableAccount(params.row)}
          />,
        ],
      },
    ],
    [onAssignInboundClick, onDisableAccount, onFreeEnable],
  );
  useEffect(() => {
    if (selectedTariff) {
      setIsTariffInboundModalOpen(true);
    }
  }, [selectedTariff]);
  const handleModalClose = (): void => {
    setIsTariffInboundModalOpen(false);
    setSelectedTariff(undefined);
  };

  const handleModalMessage = (messageType: string, message: string): void => {
    onMessage(messageType, message);
    handleModalClose();
  };
  return (
    <div className="container-fluid my-3  ">
      <DataGridShell
        getRowId={(row) => row._id ?? `${row.Title}-${row.Duration}-${row.DataLimit}-${row.Price}`}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10]}
        className="Grid"
        rows={props.Tariffs}
        columns={columns}
        loading={props.Loading}
        sx={{ width: 400 }}
      />
      <Footer></Footer>
      <TariffInboundModal
        isOpen={isTariffInboundModalOpen}
        onClose={handleModalClose}
        tariff={selectedTariff}
        onMessage={handleModalMessage}
      />
    </div>
  );
}
