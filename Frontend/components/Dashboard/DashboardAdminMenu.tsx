"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent, ReactElement } from "react";
import { useState } from "react";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";

import { useMyContext } from "@/context/MyContext";
import {
  dashboardMenuLabels,
  dashboardTabLabels,
  dashboardTabs,
  type DashboardTab,
} from "@/utils/dashboardTabs";

type DashboardAdminMenuProps = {
  activeTab: DashboardTab;
};

export default function DashboardAdminMenu({
  activeTab,
}: DashboardAdminMenuProps): ReactElement | null {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useMyContext();

  if (!user.IsAdmin) return null;

  const handleMenuOpen = (event: MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (): void => {
    setAnchorEl(null);
  };

  const handleSelect = (tab: DashboardTab): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`);
    handleMenuClose();
  };

  return (
    <div className="row ActiveComponentNameRow">
      <div className="col-12 d-inline-flex">
        <Box
          sx={{
            display: "flex",
            alignItems: "start",
            textAlign: "center",
          }}
        >
          <Tooltip title="Fair Internet Dashboard">
            <IconButton
              onClick={handleMenuOpen}
              size="small"
              sx={{
                ml: 1,
                color: "gray",
              }}
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
              <Avatar
                sx={{
                  width: 50,
                  height: 50,
                  backgroundColor: "warning.light",
                  border: "solid 2px warning.dark",
                }}
              >
                DB
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
              mt: 1.5,
              "& .MuiAvatar-root": {
                width: 32,
                height: 32,
                ml: -0.5,
                mr: 1,
              },
              "&::before": {
                content: '""',
                display: "block",
                position: "absolute",
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: "background.paper",
                transform: "translateY(-50%) rotate(45deg)",
                zIndex: 0,
              },
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          {dashboardTabs.map((tab) => (
            <MenuItem key={tab} onClick={() => handleSelect(tab)}>
              {dashboardMenuLabels[tab]}
            </MenuItem>
          ))}
        </Menu>
        <div className="w-25"></div>
        <div className="ActiveComponentName w-75">{dashboardTabLabels[activeTab]}</div>
      </div>
    </div>
  );
}
