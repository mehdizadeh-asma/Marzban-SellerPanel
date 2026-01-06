import type { ReactElement } from "react";

import type { Theme } from "@mui/material/styles";
import type { SxProps, SystemStyleObject } from "@mui/system";
import type { DataGridProps, GridValidRowModel } from "@mui/x-data-grid";
import { DataGrid } from "@mui/x-data-grid";

const baseSx: SxProps<Theme> = {
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
};

type SxItem = SystemStyleObject<Theme> | ((theme: Theme) => SystemStyleObject<Theme>) | boolean;
type SxArray = ReadonlyArray<SxItem>;

const isSxArray = (value: SxProps<Theme>): value is SxArray => Array.isArray(value);

const mergeSx = (sx?: SxProps<Theme>): SxProps<Theme> => {
  if (!sx) {
    return baseSx;
  }
  const sxList = isSxArray(sx) ? sx : [sx];
  return [baseSx, ...sxList];
};

export default function DataGridShell<R extends GridValidRowModel>(
  props: DataGridProps<R>,
): ReactElement {
  const { sx, ...rest } = props;
  return <DataGrid {...rest} sx={mergeSx(sx)} />;
}
