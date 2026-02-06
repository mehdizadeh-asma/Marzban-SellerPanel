export const dashboardTabs = ["accounts", "packages", "agents"] as const;

export type DashboardTab = (typeof dashboardTabs)[number];

export const dashboardTabLabels: Record<DashboardTab, string> = {
  accounts: "My Accounts Management",
  packages: "My Packages Management",
  agents: "My Agents Management",
};

export const dashboardMenuLabels: Record<DashboardTab, string> = {
  accounts: "My Accounts",
  packages: "My Packages",
  agents: "My Agents",
};

export const normalizeDashboardTab = (
  value: string | string[] | undefined,
  fallback: DashboardTab = "accounts",
): DashboardTab => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized && dashboardTabs.includes(normalized as DashboardTab)) {
    return normalized as DashboardTab;
  }

  return fallback;
};
