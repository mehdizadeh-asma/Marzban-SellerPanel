"use client";

import { useRouter } from "next/navigation";
import type { ReactElement } from "react";

import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";

import { useMyContext } from "@/context/MyContext";

export default function DashboardHeader(): ReactElement {
  const router = useRouter();
  const { user, setUser } = useMyContext();

  const handleLogout = (): void => {
    setUser({
      accessToken: "",
      IsAdmin: false,
      Username: "",
      Limit: 0,
      TotalPrice: 0,
    });
    router.push("/seller");
  };

  return (
    <div className="row BgGrdColorizePurple justify-content-end d-flex bg-primary">
      <div className="col-10 container d-inline-flex align-items-start py-1 ">
        <div className="row flex-wrap">
          <div className="col-12 columnFlex">
            <h6 className="text-white mx-3 py-1 ">Welcome {user.Username}</h6>
          </div>
        </div>
        <div className="row">
          <div className="col-12">
            <h6 className="text-white mx-3 d-flex py-1">
              Data Limit:
              <label className="text-warning mx-1">
                {user.Limit} <label className="text-white">GB</label>
              </label>
            </h6>
          </div>
        </div>
        <div className="row">
          <div className="col-12">
            <h6 className="text-white mx-3 d-flex py-1">
              Total Price:
              <label className="text-warning mx-1">
                {user.TotalPrice} <label className="text-white">IRT</label>
              </label>
            </h6>
          </div>
        </div>
      </div>
      <div className="col-2  d-flex  justify-content-end justify-content-xm-center py-1">
        <button className="btn border-0" onClick={handleLogout}>
          <PowerSettingsNewIcon className="text-white" />
        </button>
      </div>
    </div>
  );
}
