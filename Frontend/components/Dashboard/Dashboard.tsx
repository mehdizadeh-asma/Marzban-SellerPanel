import type { ReactElement } from "react";

import DashboardAdminMenu from "@/components/Dashboard/DashboardAdminMenu";
import DashboardAuthGate from "@/components/Dashboard/DashboardAuthGate";
import DashboardContent from "@/components/Dashboard/DashboardContent";
import DashboardHeader from "@/components/Dashboard/DashboardHeader";
import type { DashboardTab } from "@/utils/dashboardTabs";

type DashboardProps = {
  activeTab: DashboardTab;
};

export default function Dashboard({ activeTab }: DashboardProps): ReactElement {
  return (
    <div className="container-fluid pageContainer">
      <DashboardAuthGate />
      <DashboardHeader />
      <div className="row  flex-wrap">
        <div className="col-12 columnFlex  " id="mydiv">
          <DashboardAdminMenu activeTab={activeTab} />
          <DashboardContent activeComponent={activeTab} />
        </div>
      </div>
    </div>
  );
}
