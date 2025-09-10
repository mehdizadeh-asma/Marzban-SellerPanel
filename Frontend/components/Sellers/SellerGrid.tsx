import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridActionsColDef,
} from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import AssignPackageIcon from "@mui/icons-material/MonetizationOn";

import SellerType from "@/models/SellerType";
import Footer from "../General/Footer";

interface PropsType {
  Loading: boolean;
  Sellers: SellerType[];
  onDeleting: (seller: SellerType) => void;
  onEditing: (seller: SellerType) => void;
  onDisableAccount: (seller: SellerType) => void;
  onAssignPackages: (seller: SellerType) => void;
}

export default function SellerGrid(props: PropsType) {
  const columns: (GridColDef<SellerType> | GridActionsColDef<SellerType>)[] = [
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
      field: "Password",
      headerName: "Password",
      width: 120,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "MarzbanUsername",
      headerName: "MarzbanUsername",
      width: 120,
      headerClassName: "MUIGridHeader",
    },
    {
      field: "MarzbanPassword",
      headerName: "MarzbanPassword",
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
      getActions: (params: { row: SellerType }) => [
        <GridActionsCellItem
          key="active"
          label="Active"
          icon={
            params.row.Status == "Active" ? (
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
      ],
    },
    {
      headerClassName: "MUIGridHeader",
      headerName: "",
      field: "AssignPackages",
      type: "actions",
      width: 50,
      getActions: (params: { row: SellerType }) => [
        <GridActionsCellItem
          key="AssignPackages"
          label="AssignPackages"
          icon={<AssignPackageIcon className="text-info" />}
          onClick={() => onAssignPackagesClick(params.row)}
        />,
      ],
    },
    {
      headerClassName: "MUIGridHeader",
      headerName: "",
      field: "edit",
      type: "actions",
      width: 30,
      getActions: (params: { row: SellerType }) => [
        <GridActionsCellItem
          key="edit"
          label="Edit"
          icon={<EditIcon className="text-primary" />}
          onClick={() => onEditClick(params.row)}
        />,
      ],
    },
    {
      headerClassName: "MUIGridHeader",
      headerName: "",
      field: "delete",
      type: "actions",
      width: 30,
      getActions: (params: { row: SellerType }) => [
        <GridActionsCellItem
          key="delete"
          label="Delete"
          icon={<DeleteIcon className="text-danger" />}
          onClick={() => onDeleteClick(params.row)}
        />,
      ],
    },
  ];

  const onAssignPackagesClick = (seller: SellerType) => {
    props.onAssignPackages(seller);
  };
  const onDeleteClick = (seller: SellerType) => {
    props.onDeleting(seller);
  };
  const onEditClick = (seller: SellerType) => {
    props.onEditing(seller);
  };

  const onDisableAccount = (seller: SellerType) => {
    props.onDisableAccount(seller);
  };

  return (
    <div className="container my-3 GridSellerContainer ">
      <div className="row d-flex justify-content-center  ">
        <div className="col-12">
          <DataGrid
            getRowId={(row) => row.Title}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10]}
            className="Grid"
            rows={props.Sellers}
            columns={columns}
            loading={props.Loading}
            sx={{
              boxShadow: 2,
              border: 2,
              borderColor: "purple",
              width: "100%",
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
        </div>
        <Footer></Footer>
      </div>
    </div>
  );
}
