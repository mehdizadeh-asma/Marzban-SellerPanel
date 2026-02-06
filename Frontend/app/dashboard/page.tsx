import type { ReactElement } from "react";

import Dashboard from "@/components/Dashboard/Dashboard";
import { normalizeDashboardTab } from "@/utils/dashboardTabs";

type DashboardPageProps = {
  searchParams?: {
    tab?: string | string[];
  };
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps): Promise<ReactElement> {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const activeTab = normalizeDashboardTab(resolvedSearchParams?.tab);

  return <Dashboard activeTab={activeTab} />;
}
