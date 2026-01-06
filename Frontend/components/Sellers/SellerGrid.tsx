import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AssignPackageIcon from "@mui/icons-material/MonetizationOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import type { GridActionsCellItemProps, GridActionsColDef, GridColDef } from "@mui/x-data-grid";
import { GridActionsCellItem } from "@mui/x-data-grid";
import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";

import type SellerType from "@/models/SellerType";

import DataGridShell from "../General/DataGridShell";
import Footer from "../General/Footer";

interface PropsType {
  Loading: boolean;
  Sellers: SellerType[];
  onDeleting: (seller: SellerType) => void;
  onEditing: (seller: SellerType) => void;
  onDisableAccount: (seller: SellerType) => void;
  onAssignPackages: (seller: SellerType) => void;
}

export default function SellerGrid(props: PropsType): ReactElement | null {
  const { onAssignPackages, onDeleting, onDisableAccount, onEditing } = props;

  const getRowKey = useCallback(
    (row: SellerType): string =>
      String(row._id ?? `${row.Username}-${row.MarzbanUsername}-${row.Title}`),
    [],
  );

  const columns: (GridColDef<SellerType> | GridActionsColDef<SellerType>)[] = useMemo(
    () => [
      {
        field: "Title",
        headerName: "Title",
        width: 100,
        headerClassName: "MUIGridHeader",
      },
      {
        field: "Username",
        headerName: "Username",
        width: 100,
        headerClassName: "MUIGridHeader",
      },
      {
        field: "MarzbanUsername",
        headerName: "MarzbanUsername",
        width: 120,
        headerClassName: "MUIGridHeader",
      },
      {
        field: "Limit",
        headerName: "Limit(GB)",
        width: 80,
        headerClassName: "MUIGridHeader",
      },
      {
        field: "TotalPrice",
        headerName: "TotalPrice (IRT)",
        width: 100,
        headerClassName: "MUIGridHeader",
      },
      {
        headerName: "Status",
        field: "active",
        type: "actions",
        width: 80,
        headerClassName: "MUIGridHeader",
        getActions: (params: {
          row: SellerType;
        }): readonly ReactElement<GridActionsCellItemProps>[] => [
          <GridActionsCellItem
            key="active"
            label="Active"
            icon={
              params.row.Status === "Active" ? (
                <ToggleOnIcon sx={{ fontSize: "35px" }} className="text-success " />
              ) : (
                <ToggleOffIcon className="text-secondry " sx={{ fontSize: "35px" }} />
              )
            }
            onClick={() => onDisableAccount(params.row)}
          />,
        ],
      },
      {
        headerClassName: "MUIGridHeader",
        headerName: "",
        field: "AssignPackages",
        type: "actions",
        width: 50,
        getActions: (params: {
          row: SellerType;
        }): readonly ReactElement<GridActionsCellItemProps>[] => [
          <GridActionsCellItem
            key="AssignPackages"
            label="AssignPackages"
            icon={<AssignPackageIcon className="text-info" />}
            onClick={() => onAssignPackages(params.row)}
          />,
        ],
      },
      {
        headerClassName: "MUIGridHeader",
        headerName: "",
        field: "edit",
        type: "actions",
        width: 30,
        getActions: (params: {
          row: SellerType;
        }): readonly ReactElement<GridActionsCellItemProps>[] => [
          <GridActionsCellItem
            key="edit"
            label="Edit"
            icon={<EditIcon className="text-primary" />}
            onClick={() => onEditing(params.row)}
          />,
        ],
      },
      {
        headerClassName: "MUIGridHeader",
        headerName: "",
        field: "delete",
        type: "actions",
        width: 30,
        getActions: (params: {
          row: SellerType;
        }): readonly ReactElement<GridActionsCellItemProps>[] => [
          <GridActionsCellItem
            key="delete"
            label="Delete"
            icon={<DeleteIcon className="text-danger" />}
            onClick={() => onDeleting(params.row)}
          />,
        ],
      },
    ],
    [onAssignPackages, onDeleting, onDisableAccount, onEditing],
  );

  return (
    <div className="container my-3 GridSellerContainer ">
      <div className="row d-flex justify-content-center  ">
        <div className="col-12">
          <DataGridShell
            getRowId={(row) => getRowKey(row)}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10]}
            className="Grid"
            rows={props.Sellers}
            columns={columns}
            loading={props.Loading}
          />
        </div>
        <Footer></Footer>
      </div>
    </div>
  );
}
