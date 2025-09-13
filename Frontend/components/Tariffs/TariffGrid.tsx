import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import AssignInboundIcon from "@mui/icons-material/AccountTree";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import type { GridActionsCellItemProps, GridColDef } from "@mui/x-data-grid";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";

import type TariffType from "@/models/TariffType";

import Footer from "../General/Footer";
import TariffInboundModal from "./TariffInboundModal";

interface PropsType {
  Loading: boolean;
  Tariffs: TariffType[];
  onDisableAccount: (tariff: TariffType) => void;
  onFreeChanged: (tariff: TariffType) => void;
  onMessage: (messageType: string, message: string) => void;
}

export default function TariffGrid(props: PropsType): ReactElement | null {
  const [isTariffInboundModalOpen, setIsTariffInboundModalOpen] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<TariffType>();

  useEffect(() => {
    if (selectedTariff) {
      setIsTariffInboundModalOpen(true);
    }
  }, [selectedTariff]);

  const columns: GridColDef<TariffType>[] = [
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
  ];

  const onDisableAccount = (tariff: TariffType): void => {
    props.onDisableAccount(tariff);
  };
  const onFreeEnable = (tariff: TariffType): void => {
    props.onFreeChanged(tariff);
  };
  const onAssignInboundClick = (tariff: TariffType): void => {
    setSelectedTariff(tariff);
  };
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
    props.onMessage(messageType, message);
    handleModalClose();
  };
  return (
    <div className="container-fluid my-3  ">
      <DataGrid
        getRowId={(row) => row._id!}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10]}
        className="Grid"
        rows={props.Tariffs}
        columns={columns}
        loading={props.Loading}
        sx={{
          boxShadow: 2,
          border: 2,
          borderColor: "purple",
          width: "400",
          "& .MuiDataGrid-row:hover": {
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
      <Footer></Footer>
      <TariffInboundModal
        isOpen={isTariffInboundModalOpen}
        onClose={handleModalClose}
        tariff={selectedTariff}
        onAssign={onAssignInboundClick}
        onMessage={handleModalMessage}
      />
    </div>
  );
}
