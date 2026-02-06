import type { ReactElement } from "react";

import AccountManagment from "@/components/Accounts/AccountManagement";
import SellerManagement from "@/components/Sellers/SellerManagement";
import TariffManagement from "@/components/Tariffs/TariffManagement";
import type { DashboardTab } from "@/utils/dashboardTabs";

type DashboardContentProps = {
  activeComponent: DashboardTab;
};

export default function DashboardContent({ activeComponent }: DashboardContentProps): ReactElement {
  return (
    <div>
      {activeComponent === "accounts" && <AccountManagment></AccountManagment>}
      {activeComponent === "packages" && <TariffManagement></TariffManagement>}
      {activeComponent === "agents" && <SellerManagement></SellerManagement>}
    </div>
  );
}
