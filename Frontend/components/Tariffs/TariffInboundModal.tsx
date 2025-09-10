"use client";
import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import axios from "axios";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridActionsColDef,
} from "@mui/x-data-grid";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";

import { useMyContext } from "@/context/MyContext";
import TariffType from "@/models/TariffType";
import TariffInboundType from "@/models/TariffInboundType";

interface PropsType {
  isOpen: boolean;
  onClose: () => void;
  tariff: TariffType | undefined;
  onAssign: (tariff: TariffType) => void;
  onMessage: (messageType: string, message: string) => void;
}

const TariffInboundModal = (props: PropsType) => {
  const { user, config } = useMyContext();
  const [assignedTariffInboundList, setAssignedTariffInboundList] = useState<
    TariffInboundType[]
  >([]);
  const [rawTariffInboundList, setRawTariffInboundList] = useState<
    TariffInboundType[]
  >([]);

  const columns: (
    | GridColDef<TariffInboundType>
    | GridActionsColDef<TariffInboundType>
  )[] = [
    {
      field: "InboundTag",
      headerName: "Tag",
      width: 250,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "InboundType",
      headerName: "Type",
      width: 100,
      headerClassName: "MUIGridHeader",
    },
    {
      headerName: "Assign",
      field: "active",
      type: "actions",
      width: 100,
      headerClassName: "MUIGridHeader",
      getActions: (params: { row: TariffInboundType }) => [
        <GridActionsCellItem
          key="assign"
          label="Assign"
          icon={changeIcon(params.row.TariffId)}
          onClick={() => handleAssignToggle(params.row.InboundTag)}
        />,
      ],
    },
  ];
  const changeIcon = (tariffId: string) => {
    return tariffId != "" ? (
      <ToggleOnIcon sx={{ fontSize: "35px" }} className="text-success" />
    ) : (
      <ToggleOffIcon sx={{ fontSize: "35px" }} className="text-secondary" />
    );
  };

  const handleAssignToggle = (InboundTag: string) => {
    if (!InboundTag) return;

    setAssignedTariffInboundList((prevList) => {
      const isAssigned = prevList.some(
        (item) => item.InboundTag === InboundTag,
      );
      if (isAssigned)
        return prevList.filter((item) => item.InboundTag !== InboundTag);
      else {
        const rawItem = rawTariffInboundList.find(
          (item) => item.InboundTag === InboundTag,
        );

        if (rawItem) {
          return [...prevList, rawItem];
        }
        return prevList;
      }
    });

    setRawTariffInboundList((prevList) =>
      prevList.map((item) =>
        item.InboundTag === InboundTag
          ? {
              ...item,
              TariffId: item.TariffId ? "" : props.tariff?._id || "",
            }
          : item,
      ),
    );
  };

  const LaodTariffInbound = useCallback(async () => {
    try {
      const url = new URL(
        "api/TariffInbound/" + props.tariff?._id,
        config.BACKEND_URL,
      );

      const resultInbounds = await axios.get(url.toString(), {
        headers: { Authorization: "Bearer " + user.Token },
      });

      setRawTariffInboundList(resultInbounds.data);
      const tlist: TariffInboundType[] = [];
      resultInbounds.data.map((item: TariffInboundType) => {
        if (item.TariffId != "") tlist.push(item);
      });
      setAssignedTariffInboundList(tlist);
    } catch (error) {
      console.log(error);
    }
  }, [props.tariff?._id, config.BACKEND_URL, user.Token]);
  useEffect(() => {
    if (props.isOpen && user.Token !== "") {
      LaodTariffInbound();
    }
  }, [LaodTariffInbound, user.Token, props.isOpen]);

  const btnSave_Click = async () => {
    if (!props.tariff?._id) {
      props.onMessage("error", "Tariff ID is required to assign inbounds.");
      return;
    }

    try {
      const url = new URL(
        "api/TariffInbound/" + props.tariff._id,
        config.BACKEND_URL,
      );

      const payload = assignedTariffInboundList.map((item) => ({
        InboundTag: item.InboundTag,
        InboundType: item.InboundType,
      }));

      await axios.put(url.toString(), payload, {
        headers: { Authorization: "Bearer " + user.Token },
      });

      props.onClose();

      props.onMessage("success", "Inbounds Assigned to Package Successfully!");
    } catch (error) {
      props.onMessage(
        "error",
        "An error occurred while assigning inbounds to the package:" + error,
      );
      props.onClose();
    } finally {
      LaodTariffInbound();
    }
  };

  const btnCancel_Click = () => {
    props.onClose();
  };

  return (
    <Modal
      className="border border-1 shadow rounded-3  "
      show={props.isOpen}
      backdrop="static"
      keyboard={false}
      onHide={btnCancel_Click}
    >
      <Modal.Header closeButton className=" text-white bg-success">
        <Modal.Title>
          Assigned Inbounds <label className="text-warning">{}</label>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <DataGrid
          getRowId={(row) => row.InboundTag || `temp-id-${Math.random()}`}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10]}
          className="Grid"
          rows={rawTariffInboundList}
          columns={columns}
          sx={{
            boxShadow: 2,
            border: 2,
            borderColor: "purple",
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
      </Modal.Body>
      <Modal.Footer className="justify-content-end">
        <Button variant="success" className="w100px" onClick={btnSave_Click}>
          Save
        </Button>
        <Button variant="dark" className="w100px" onClick={btnCancel_Click}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TariffInboundModal;
