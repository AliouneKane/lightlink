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
import type { Neighborhood } from "@/lib/energy";
import {
  defaultDisplay,
  sectionIds,
  updateDisplay,
  useDisplay,
  type SectionId,
} from "@/lib/display-store";

export const navigation = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/carte", label: "Carte du réseau", icon: Map },
  { href: "/previsions", label: "Prévisions", icon: Sparkles },
  { href: "/partage", label: "Partager l’énergie", icon: HeartHandshake },
  { href: "/communaute", label: "Communauté", icon: Users },
];
const sectionLabels: Record<SectionId, string> = {
  offers: "Énergie à proximité",
  network: "Carte du réseau",
  insights: "Prévisions et activité",
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
}) {
  const pathname = usePathname();
  const display = useDisplay();
  const [menuOpen, setMenuOpen] = useState(false);
  const page = navigation.find((item) => item.href === pathname) ?? {
    label: "Paramètres",
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
        Aller au contenu
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Fermer la navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Navigation principale"
      >
        <div className="sidebar-brand">
          <Link
            className="brand-link"
            href="/"
            aria-label="LightLink — Tableau de bord"
            onClick={() => setMenuOpen(false)}
          >
            <Brand compact={display.collapsed && !menuOpen} />
          </Link>
          <button
            className="mobile-close icon-button"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <label className="sidebar-search global-search">
          <Search size={16} />
          <input
            aria-label="Rechercher un quartier ou une offre"
            placeholder="Rechercher dans LightLink"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
          {search && (
            <button
              aria-label="Effacer la recherche"
              onClick={() => onSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <div className="sidebar-actions">
          <button
            className="button primary"
            onClick={() => onDialog("report")}
            title="Signaler une coupure"
          >
            <Plus size={17} />
            <span>Signaler une coupure</span>
          </button>
          <button
            className="icon-button"
            aria-label="Partager de l’énergie"
            title="Partager de l’énergie"
            onClick={() => onDialog("offer")}
          >
            <HeartHandshake size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="Comment fonctionne LightLink"
            title="Comment fonctionne LightLink"
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
                {item.href === "/partage" && (
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
            <span>Quartiers pilotes</span>
            <ChevronDown size={14} className="sidebar-group-chevron" />
          </button>
          <div
            className="sidebar-zone-links"
            id="sidebar-pilot-neighborhoods"
            hidden={!display.neighborhoodsOpen}
          >
            {zones.map((zone) => (
              <Link
                href={`/carte?quartier=${zone.id}`}
                key={zone.id}
                title={`${zone.name} · ${zone.reports} signalements`}
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
            <span>Sources d’énergie</span>
          </div>
          <div className="source-nav">
            {[
              {
                id: "solar",
                label: "Solaire",
                icon: Sun,
                count: sourceCounts.solar,
              },
              {
                id: "generator",
                label: "Générateur",
                icon: Zap,
                count: sourceCounts.generator,
              },
              {
                label: "Batterie",
                id: "battery",
                icon: BatteryCharging,
                count: sourceCounts.battery,
              },
            ].map((source) => (
              <Link
                href={`/partage?source=${source.id}`}
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
            Accra, Ghana · 10 zones pilotes
          </span>
        </div>
        <div className="sidebar-footer">
          <Link
            href="/parametres"
            className={`nav-item ${pathname === "/parametres" ? "active" : ""}`}
            onClick={() => setMenuOpen(false)}
            title="Paramètres"
          >
            <Settings2 size={18} />
            <span>Paramètres</span>
          </Link>
          <div className="sidebar-user-row">
            <button className="profile-button" onClick={() => onDialog("auth")}>
              <span className="avatar">{initials}</span>
              <span>
                {profile.name}
                <small>Profil de démonstration</small>
              </span>
            </button>
            <button
              className="icon-button sidebar-collapse"
              aria-label={
                display.collapsed
                  ? "Développer la barre latérale"
                  : "Réduire la barre latérale"
              }
              title={
                display.collapsed
                  ? "Développer la barre latérale"
                  : "Réduire la barre latérale"
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
              aria-label="Ouvrir le menu"
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
              aria-label="Signaler mon quartier"
              onClick={() => onDialog("report")}
            >
              <Plus size={18} />
            </button>
            <span className="demo-badge">
              <span />
              DÉMO
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
                  aria-label="Modifier la disposition"
                  title="Modifier la disposition"
                >
                  <SlidersHorizontal size={15} />
                  <span>Modifier la disposition</span>
                </summary>
                <div className="layout-options">
                  <strong>Votre tableau de bord</strong>
                  <p>Affichez et réorganisez vos sections.</p>
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
                        aria-label={`Monter ${sectionLabels[id]}`}
                        disabled={index === 0}
                        onClick={() => moveSection(id, -1)}
                      >
                        <ChevronLeft size={14} className="rotate-up" />
                      </button>
                      <button
                        aria-label={`Descendre ${sectionLabels[id]}`}
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
                    Rétablir la disposition
                  </button>
                </div>
              </details>
            )}
            <button
              className="icon-button theme-button"
              aria-label={
                display.theme === "dark"
                  ? "Activer le thème clair"
                  : "Activer le thème sombre"
              }
              title={display.theme === "dark" ? "Thème clair" : "Thème sombre"}
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
              aria-label="Voir les notifications"
              onClick={() => onDialog("notifications")}
            >
              <Bell size={18} />
              {bookingCount > 0 && <span className="notification-dot" />}
            </button>
            <button
              className="top-avatar avatar"
              aria-label="Mon profil"
              onClick={() => onDialog("auth")}
            >
              {initials}
            </button>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={16} />
            Hors connexion. Vos contributions restent sur cet appareil ; la
            carte nécessite internet.
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
