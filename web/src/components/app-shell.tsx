"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BatteryCharging,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  HeartHandshake,
  LayoutDashboard,
  Map,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Radio,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { Brand } from "./ui";
import type { LiveState } from "@/lib/live";
import type { Neighborhood } from "@/lib/energy";
import {
  defaultDisplay,
  sectionIds,
  updateDisplay,
  useDisplay,
  type SectionId,
} from "@/lib/display-store";

export const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Network map", icon: Map },
  { href: "/forecast", label: "Forecast", icon: Sparkles },
  { href: "/sharing", label: "Share energy", icon: HeartHandshake },
  { href: "/community", label: "Community", icon: Users },
];
const sectionLabels: Record<SectionId, string> = {
  offers: "Energy nearby",
  network: "Network map",
  insights: "Forecast and activity",
};
export type AppDialog =
  "report" | "offer" | "auth" | "notifications" | "help" | "reset";

export function AppShell({
  children,
  search,
  onSearch,
  onDialog,
  profile,
  zones,
  offerCount,
  bookingCount,
  online,
  sourceCounts,
  liveState,
}: {
  children: ReactNode;
  search: string;
  onSearch: (value: string) => void;
  onDialog: (dialog: AppDialog) => void;
  profile: { name: string; neighborhoodId: string };
  zones: Neighborhood[];
  offerCount: number;
  sourceCounts: Record<"solar" | "generator" | "battery", number>;
  bookingCount: number;
  online: boolean;
  liveState: LiveState;
}) {
  const pathname = usePathname();
  const display = useDisplay();
  const [menuOpen, setMenuOpen] = useState(false);
  const page = navigation.find((item) => item.href === pathname) ?? {
    label: "Settings",
    icon: Settings2,
  };
  const PageIcon = page.icon;
  const initials = profile.name
    .trim()
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function moveSection(id: SectionId, direction: -1 | 1) {
    updateDisplay((previous) => {
      const order = [...previous.order];
      const index = order.indexOf(id);
      const next = index + direction;
      if (next < 0 || next >= order.length) return previous;
      [order[index], order[next]] = [order[next], order[index]];
      return { ...previous, order };
    });
  }

  return (
    <div
      className={`app-shell ${display.collapsed ? "sidebar-is-collapsed" : ""}`}
      data-theme={display.theme}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <Link
            className="brand-link"
            href="/"
            aria-label="LightLink — Dashboard"
            onClick={() => setMenuOpen(false)}
          >
            <Brand compact={display.collapsed && !menuOpen} />
          </Link>
          <button
            className="mobile-close icon-button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <label className="sidebar-search global-search">
          <Search size={16} />
          <input
            aria-label="Search a neighbourhood or an offer"
            placeholder="Search LightLink"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
          {search && (
            <button aria-label="Clear search" onClick={() => onSearch("")}>
              <X size={14} />
            </button>
          )}
        </label>
        <div className="sidebar-actions">
          <button
            className="button primary"
            onClick={() => onDialog("report")}
            title="Report an outage"
          >
            <Plus size={17} />
            <span>Report an outage</span>
          </button>
          <button
            className="icon-button"
            aria-label="Share energy"
            title="Share energy"
            onClick={() => onDialog("offer")}
          >
            <HeartHandshake size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="How LightLink works"
            title="How LightLink works"
            onClick={() => onDialog("help")}
          >
            <CircleHelp size={18} />
          </button>
        </div>
        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className={`nav-item ${pathname === item.href ? "active" : ""}`}
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                title={item.label}
                onClick={() => {
                  setMenuOpen(false);
                  onSearch("");
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.href === "/sharing" && (
                  <span className="nav-count">{offerCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-scroll">
          <button
            type="button"
            className="sidebar-group-title sidebar-group-toggle"
            aria-expanded={display.neighborhoodsOpen}
            aria-controls="sidebar-pilot-neighborhoods"
            onClick={() =>
              updateDisplay((previous) => ({
                ...previous,
                neighborhoodsOpen: !previous.neighborhoodsOpen,
              }))
            }
          >
            <MapPinSymbol />
            <span>Pilot neighbourhoods</span>
            <ChevronDown size={14} className="sidebar-group-chevron" />
          </button>
          <div
            className="sidebar-zone-links"
            id="sidebar-pilot-neighborhoods"
            hidden={!display.neighborhoodsOpen}
          >
            {zones.map((zone) => (
              <Link
                href={`/map?zone=${zone.id}`}
                key={zone.id}
                title={`${zone.name} · ${zone.reports} reports`}
                onClick={() => {
                  setMenuOpen(false);
                  onSearch("");
                }}
              >
                <span className={`zone-color ${zone.status}`} />
                <span className="zone-name">{zone.name}</span>
                <span className="zone-count">{zone.reports}</span>
              </Link>
            ))}
          </div>
          <div className="sidebar-group-title">
            <Zap size={16} />
            <span>Energy sources</span>
          </div>
          <div className="source-nav">
            {[
              {
                id: "solar",
                label: "Solar",
                icon: Sun,
                count: sourceCounts.solar,
              },
              {
                id: "generator",
                label: "Generator",
                icon: Zap,
                count: sourceCounts.generator,
              },
              {
                label: "Battery",
                id: "battery",
                icon: BatteryCharging,
                count: sourceCounts.battery,
              },
            ].map((source) => (
              <Link
                href={`/sharing?source=${source.id}`}
                key={source.label}
                onClick={() => {
                  setMenuOpen(false);
                  onSearch("");
                }}
              >
                <source.icon size={16} />
                <span>{source.label}</span>
                <small>{source.count}</small>
              </Link>
            ))}
          </div>
          <span className="sidebar-meta">
            <Radio size={12} />
            Accra, Ghana · 10 pilot areas
          </span>
        </div>
        <div className="sidebar-footer">
          <Link
            href="/settings"
            className={`nav-item ${pathname === "/settings" ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
            title="Settings"
          >
            <Settings2 size={18} />
            <span>Settings</span>
          </Link>
          <div className="sidebar-user-row">
            <button className="profile-button" onClick={() => onDialog("auth")}>
              <span className="avatar">{initials}</span>
              <span>
                {profile.name}
                <small>Demo profile</small>
              </span>
            </button>
            <button
              className="icon-button sidebar-collapse"
              aria-label={
                display.collapsed
                  ? "Expand the sidebar"
                  : "Collapse the sidebar"
              }
              title={
                display.collapsed
                  ? "Expand the sidebar"
                  : "Collapse the sidebar"
              }
              onClick={() =>
                updateDisplay((previous) => ({
                  ...previous,
                  collapsed: !previous.collapsed,
                }))
              }
            >
              {display.collapsed ? (
                <PanelLeftOpen size={17} />
              ) : (
                <PanelLeftClose size={17} />
              )}
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={22} />
            </button>
            <h1 className="topbar-title">
              <PageIcon size={24} />
              {page.label}
            </h1>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button mobile-report"
              aria-label="Report my neighbourhood"
              onClick={() => onDialog("report")}
            >
              <Plus size={18} />
            </button>
            {/* Live mode: reports, map and forecasts come from Supabase. Energy sharing stays simulated. */}
            <span className="demo-badge" role="status">
              <span />
              {
                {
                  off: "DEMO",
                  loading: "CONNECTING…",
                  ready: "LIVE",
                  error: "OFFLINE",
                }[liveState]
              }
            </span>
            {pathname === "/" && (
              <details
                className="layout-menu"
                onKeyDown={(event) => {
                  if (event.key === "Escape") event.currentTarget.open = false;
                }}
              >
                <summary
                  className="layout-trigger"
                  aria-label="Edit layout"
                  title="Edit layout"
                >
                  <SlidersHorizontal size={15} />
                  <span>Edit layout</span>
                </summary>
                <div className="layout-options">
                  <strong>Your dashboard</strong>
                  <p>Show and reorder your sections.</p>
                  {display.order.map((id, index) => (
                    <div className="layout-option" key={id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={display.visible[id]}
                          onChange={() =>
                            updateDisplay((previous) => ({
                              ...previous,
                              visible: {
                                ...previous.visible,
                                [id]: !previous.visible[id],
                              },
                            }))
                          }
                        />
                        {sectionLabels[id]}
                      </label>
                      <button
                        aria-label={`Move up ${sectionLabels[id]}`}
                        disabled={index === 0}
                        onClick={() => moveSection(id, -1)}
                      >
                        <ChevronLeft size={14} className="rotate-up" />
                      </button>
                      <button
                        aria-label={`Move down ${sectionLabels[id]}`}
                        disabled={index === sectionIds.length - 1}
                        onClick={() => moveSection(id, 1)}
                      >
                        <ChevronRight size={14} className="rotate-up" />
                      </button>
                    </div>
                  ))}
                  <button
                    className="text-button"
                    onClick={() =>
                      updateDisplay((previous) => ({
                        ...defaultDisplay,
                        theme: previous.theme,
                        collapsed: previous.collapsed,
                        neighborhoodsOpen: previous.neighborhoodsOpen,
                      }))
                    }
                  >
                    Reset layout
                  </button>
                </div>
              </details>
            )}
            <button
              className="icon-button theme-button"
              aria-label={
                display.theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              title={display.theme === "dark" ? "Light theme" : "Dark theme"}
              onClick={() =>
                updateDisplay((previous) => ({
                  ...previous,
                  theme: previous.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {display.theme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <button
              className="notification-button icon-button"
              aria-label="View notifications"
              onClick={() => onDialog("notifications")}
            >
              <Bell size={18} />
              {bookingCount > 0 && <span className="notification-dot" />}
            </button>
            <button
              className="top-avatar avatar"
              aria-label="My profile"
              onClick={() => onDialog("auth")}
            >
              {initials}
            </button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={16} />
            Offline. Your contributions stay on this device; the map needs the
            internet.
          </div>
        )}
        <main id="main-content" className="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

function MapPinSymbol() {
  return <Map size={16} />;
}
