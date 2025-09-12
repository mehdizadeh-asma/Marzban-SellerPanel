"use client";
import Login from "@/components/Login";
import { useMyContext } from "@/context/MyContext";

export default function Home() {
  const { config } = useMyContext();
  return (
    <div className=" container-fluid m-2  justify-content-center d-flex ">
      <div className="row RedirectRow h65vh mt-2  ">
        <Login />
        <div className="col-6 ExploreDiv seconddiv text-white h-100 BgGrdColorizePurple d-flex flex-column justify-content-center align-items-end rounded-3 shadow">
          <h5 className="HeadLine ExploreDiv HoverRescale">{config.PAGE_TITLE}</h5>
        </div>
      </div>
    </div>
  );
}
