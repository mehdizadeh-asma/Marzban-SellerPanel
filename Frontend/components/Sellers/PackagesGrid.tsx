import type { ReactElement } from "react";
import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";

import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import type { AlertColor } from "@mui/material";
import type { GridActionsCellItemProps, GridColDef } from "@mui/x-data-grid";
import { GridActionsCellItem } from "@mui/x-data-grid";

import { useSellerTariffAssignments } from "@/hooks/useSellerTariffAssignments";
import type SellerType from "@/models/SellerType";
import type TariffSellerAssignmentType from "@/models/TariffSellerAssignmentType";

import DataGridShell from "../General/DataGridShell";

interface PropsType {
  seller?: SellerType;
  onMessage?: (severity: AlertColor, text: string) => void;
}
export interface ForwardRefHandle {
  SendBackList: () => string[];
}

const PackagesGrid = forwardRef<ForwardRefHandle, PropsType>((props, ref): ReactElement | null => {
  const sellerId = props.seller?._id;
  const { assignments, setAssignments, selectedTariffIds, isFetching } = useSellerTariffAssignments(
    sellerId,
    props.onMessage,
  );

  useImperativeHandle(
    ref,
    () => ({
      SendBackList: (): string[] => [...selectedTariffIds],
    }),
    [selectedTariffIds],
  );

  const handleAssignToggle = useCallback(
    (tariffId?: string): void => {
      if (!tariffId || !sellerId) return;

      setAssignments((prevList) =>
        prevList.map((item) =>
          item.TariffId.toString() === tariffId
            ? {
                ...item,
                SellerId: item.SellerId === "" ? sellerId : "",
              }
            : item,
        ),
      );
    },
    [sellerId, setAssignments],
  );

  const changeIcon = (SellerId: string): ReactElement => {
    return SellerId != "" ? (
      <ToggleOnIcon sx={{ fontSize: "35px" }} className="text-success" />
    ) : (
      <ToggleOffIcon sx={{ fontSize: "35px" }} className="text-secondary" />
    );
  };

  const columns = useMemo(
    () =>
      [
        {
          field: "Title",
          headerName: "Title",
          width: 250,
          headerClassName: "MUIGridHeader",
        },
        {
          field: "Price",
          headerName: "Price",
          width: 50,
          headerClassName: "MUIGridHeader",
        },
        {
          headerName: "Assign",
          field: "active",
          type: "actions",
          width: 100,
          headerClassName: "MUIGridHeader",
          getActions: (params: {
            row: TariffSellerAssignmentType;
          }): readonly ReactElement<GridActionsCellItemProps>[] => [
            <GridActionsCellItem
              key="assign"
              label="Assign"
              icon={changeIcon(params.row.SellerId)}
              onClick={() => handleAssignToggle(params.row.TariffId)}
            />,
          ],
        },
      ] as GridColDef<TariffSellerAssignmentType>[],
    [handleAssignToggle],
  );

  return (
    <div className="container  my-3">
      <DataGridShell
        getRowId={(row) =>
          row.TariffId || `${row.Title}-${row.Price}-${row.SellerId}-${row.TariffId || ""}`
        }
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10]}
        className="Grid"
        rows={assignments}
        columns={columns}
        loading={isFetching}
      />
    </div>
  );
});
PackagesGrid.displayName = "PackagesGrid";

export default PackagesGrid;
