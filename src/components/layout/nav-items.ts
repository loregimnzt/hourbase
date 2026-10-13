import { ChartColumn, FolderKanban, LayoutDashboard, Settings, Timer, Users } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/tracker", label: "Time Tracker", short: "Tracker", icon: Timer },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Reports", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
