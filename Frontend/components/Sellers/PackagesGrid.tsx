import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import TariffType from "@/models/TariffType";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import TariffSellerType from "@/models/TariffSellerType";
import axios from "axios";
import { useMyContext } from "@/context/MyContext";
import SellerType from "@/models/SellerType";

interface PropsType {
  seller?: SellerType;
}
export interface ForwardRefHandle {
  SendBackList: () => string[];
}

interface TariffSellerGridType {
  SellerId: string;
  Title: string;
  TariffId: string;
  Price: string;
}
const PackagesGrid = forwardRef<ForwardRefHandle, PropsType>((props, ref) => {
  const [tariffSellerList, setTariffSellerList] = useState<
    TariffSellerGridType[]
  >([]);
  const [tariffListIds, setTariffListIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, config } = useMyContext();
  const sellerId = props.seller?._id;

  useImperativeHandle(ref, () => ({
    SendBackList: () => tariffListIds,
  }));

  const LaodTariff = useCallback(async () => {
    setLoading(true);
    const tlist: string[] = [];
    try {
      // Use seller ID from props
      const url = new URL(`api/tariffSeller/${sellerId}`, config.BACKEND_URL);

      const resultTariffSellers = await axios.get(url.toString(), {
        headers: { Authorization: "Bearer " + user.Token },
      });

      setTariffSellerList(resultTariffSellers.data);

      resultTariffSellers.data.map((item: TariffSellerGridType) => {
        if (item.SellerId != "") tlist.push(item.TariffId);
      });
      setTariffListIds(tlist);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [config.BACKEND_URL, user.Token, props.seller?._id]);

  useEffect(() => {
    if (user.Token) LaodTariff();
  }, [LaodTariff, user.Token]);

  const handleAssignToggle = (tariffId?: string) => {
    if (!tariffId) return; // Type guard to check if tariffId is defined

    setTariffListIds((prevIds) =>
      prevIds.includes(tariffId)
        ? prevIds.filter((id) => id !== tariffId)
        : [...prevIds, tariffId]
    );
    setTariffSellerList((prevList) =>
      prevList.map((item) =>
        item.TariffId.toString() === tariffId
          ? {
              ...item,
              SellerId: item.SellerId === "" ? sellerId! : "",
            }
          : item
      )
    );
  };

  const changeIcon = (SellerId: string): JSX.Element => {
    return SellerId != "" ? (
      <ToggleOnIcon sx={{ fontSize: "35px" }} className="text-success" />
    ) : (
      <ToggleOffIcon sx={{ fontSize: "35px" }} className="text-secondary" />
    );
  };

  const columns = [
    {
      field: "Title",
      headerName: "Title",
      width: 200,
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
      getActions: (params: { row: TariffSellerGridType }) => [
        <GridActionsCellItem
          key="assign"
          label="Assign"
          icon={changeIcon(params.row.SellerId)}
          onClick={() => handleAssignToggle(params.row.TariffId)}
        />,
      ],
    },
  ];

  return (
    <div className="container  my-3">
      <DataGrid
        getRowId={(row) => row.TariffId || `temp-id-${Math.random()}`}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10]}
        className="Grid"
        rows={tariffSellerList}
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
    </div>
  );
});
PackagesGrid.displayName = "PackagesGrid";

export default PackagesGrid;
