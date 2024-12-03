import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import TariffType from "@/models/TariffType";
import AssignInboundIcon from "@mui/icons-material/AccountTree";
import TariffInboundModal from "./TariffInboundModal";
import { ElementRef, useEffect, useRef, useState } from "react";
import Messages from "../General/Messages";

interface PropsType {
  Loading: boolean;
  Tariffs: TariffType[];
  onDisableAccount: (tariff: TariffType) => void;
  onFreeChanged: (tariff: TariffType) => void;
  // onAssignInbound: (tariff: TariffType) => void;
  onMessage: (messageType: string, message: string) => void;
}

export default function TariffGrid(props: PropsType) {
  type MessagesHandle = ElementRef<typeof Messages>;
  const refMessages = useRef<MessagesHandle>(null);

  const [isTariffInboundModalOpen, setIsTariffInboundModalOpen] =
    useState(false);
  const [selectedTariff, setSelectedTariff] = useState<TariffType>();

  useEffect(() => {
    if (selectedTariff) {
      setIsTariffInboundModalOpen(true);
    }
  }, [selectedTariff]);

  const columns = [
    {
      field: "Title",
      headerName: "Title",
      width: 300,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "Duration",
      headerName: "Duration(Days)",
      width: 140,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "DataLimit",
      headerName: "DataLimit(GB)",
      width: 140,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "Price",
      headerName: "Price(IRT)",
      width: 100,
      headerClassName: "MUIGridHeader",
    },
    {
      headerName: "Free",
      field: "free",
      type: "actions",
      width: 100,
      headerClassName: "MUIGridHeader",
      getActions: (params: { row: TariffType }) => [
        <GridActionsCellItem
          key="free"
          label="Free"
          icon={
            params.row.IsFree ? (
              <ToggleOnIcon
                sx={{ fontSize: "35px" }}
                className="text-success "
              />
            ) : (
              <ToggleOffIcon
                className="text-secondry "
                sx={{ fontSize: "35px" }}
              />
            )
          }
          onClick={() => onFreeEnable(params.row)}
        />,
        ,
      ],
    },

    {
      headerClassName: "MUIGridHeader",
      headerName: "Inbounds",
      field: "AssignInbounds",
      type: "actions",
      width: 100,
      getActions: (params: { row: TariffType }) => [
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
      getActions: (params: { row: TariffType }) => [
        <GridActionsCellItem
          key="active"
          label="Active"
          icon={
            params.row.IsVisible ? (
              <ToggleOnIcon
                sx={{ fontSize: "35px" }}
                className="text-success "
              />
            ) : (
              <ToggleOffIcon
                className="text-secondry "
                sx={{ fontSize: "35px" }}
              />
            )
          }
          onClick={() => onDisableAccount(params.row)}
        />,
        ,
      ],
    },
  ];

  const onDisableAccount = (tariff: TariffType) => {
    props.onDisableAccount(tariff);
  };

  const onFreeEnable = (tariff: TariffType) => {
    props.onFreeChanged(tariff);
  };
  const onAssignInboundClick = (tariff: TariffType) => {
    setSelectedTariff(tariff);
  };
  useEffect(() => {
    if (selectedTariff) {
      setIsTariffInboundModalOpen(true);
    }
  }, [selectedTariff]);
  const handleModalClose = () => {
    setIsTariffInboundModalOpen(false);
    setSelectedTariff(undefined); // Reset selectedTariff when modal closes
  };

  const handleModalMessage = (messageType: string, message: string) => {
    props.onMessage(messageType, message); // Pass the message to the parent
    handleModalClose(); // Reset the state when operation finishes
  };
  return (
    <div className="container-fluid GridTariffContainer  my-3  ">
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
      {/* <TariffInboundModal
        isOpen={isTariffInboundModalOpen}
        onClose={() => setIsTariffInboundModalOpen(false)}
        tariff={selectedTariff}
        onAssign={onAssignInboundClick}
        onMessage={props.onMessage}
      /> */}
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
