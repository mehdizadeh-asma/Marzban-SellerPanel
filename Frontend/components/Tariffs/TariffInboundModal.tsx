"use client";
import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";
import { Button, Modal } from "react-bootstrap";

import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import type { GridActionsColDef, GridColDef } from "@mui/x-data-grid";
import { GridActionsCellItem } from "@mui/x-data-grid";

import { useTariffInbounds } from "@/hooks/useTariffInbounds";
import type TariffInboundType from "@/models/TariffInboundType";
import type TariffType from "@/models/TariffType";

import DataGridShell from "../General/DataGridShell";

interface PropsType {
  isOpen: boolean;
  onClose: () => void;
  tariff: TariffType | undefined;
  onMessage: (messageType: string, message: string) => void;
}

const TariffInboundModal = (props: PropsType): ReactElement | null => {
  const { isOpen, onClose, tariff, onMessage } = props;
  const tariffId = tariff?._id ?? "";
  const { tariffInbounds, setTariffInbounds, isFetching, saveAssignments, isSaving } =
    useTariffInbounds({
      tariffId,
      isOpen,
      onMessage,
      onSaved: onClose,
    });

  const changeIcon = (assignedTariffId: string): ReactElement => {
    return assignedTariffId != "" ? (
      <ToggleOnIcon sx={{ fontSize: "35px" }} className="text-success" />
    ) : (
      <ToggleOffIcon sx={{ fontSize: "35px" }} className="text-secondary" />
    );
  };

  const handleAssignToggle = useCallback(
    (InboundTag: string): void => {
      if (!InboundTag) return;
      if (!tariffId) {
        onMessage("error", "Tariff ID is required to assign inbounds.");
        return;
      }

      setTariffInbounds((prevList) =>
        prevList.map((item) =>
          item.InboundTag === InboundTag
            ? {
                ...item,
                TariffId: item.TariffId ? "" : tariffId,
              }
            : item,
        ),
      );
    },
    [onMessage, setTariffInbounds, tariffId],
  );

  const columns: (GridColDef<TariffInboundType> | GridActionsColDef<TariffInboundType>)[] = useMemo(
    () => [
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
    ],
    [handleAssignToggle],
  );

  const btnSave_Click = (): void => {
    if (!tariffId) {
      onMessage("error", "Tariff ID is required to assign inbounds.");
      return;
    }
    saveAssignments();
  };

  const btnCancel_Click = (): void => {
    onClose();
  };

  return (
    <Modal
      className="border border-1 shadow rounded-3  "
      show={isOpen}
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
        <DataGridShell
          getRowId={(row) => row.InboundTag}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          pageSizeOptions={[10]}
          className="Grid"
          rows={tariffInbounds}
          columns={columns}
          loading={isFetching}
        />
      </Modal.Body>
      <Modal.Footer className="justify-content-end">
        <Button variant="success" className="w100px" onClick={btnSave_Click} disabled={isSaving}>
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
