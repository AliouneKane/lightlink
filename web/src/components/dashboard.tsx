"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  LayoutDashboard,
  Map,
  MapPin,
  Radio,
  Users,
  Zap,
  ZapOff,
} from "lucide-react";
import type { ReactNode } from "react";
import type { Neighborhood } from "@/lib/energy";
import { defaultDisplay, updateDisplay, useDisplay } from "@/lib/display-store";
import { Status, statusLabels } from "./ui";

export function Dashboard({
  homeZone,
  zones,
  selectedId,
  outageCount,
  offerCount,
  reportCount,
  offers,
  map,
  prediction,
  community,
  onSelect,
  onClearSearch,
}: {
  homeZone: Neighborhood;
  zones: Neighborhood[];
  selectedId: string;
  /** null while the neighbourhood states are unknown (live data missing). */
  outageCount: number | null;
  offerCount: number;
  reportCount: number;
  offers: ReactNode[];
  map: ReactNode;
  prediction: ReactNode;
  community: ReactNode;
  onSelect: (id: string) => void;
  onClearSearch: () => void;
}) {
  const display = useDisplay();
  return (
    <>
      <section className="stats-grid" aria-label="Demo indicators">
        <article className="stat-card">
          <span className="stat-icon blue">
            <MapPin size={28} />
          </span>
          <div className="stat-copy">
            <span className="stat-label">Your neighbourhood</span>
            <strong className="stat-zone" title={homeZone.name}>
              {homeZone.name}
            </strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon red">
            <ZapOff size={28} />
          </span>
          <div className="stat-copy">
            <span className="stat-label">Neighbourhoods without power</span>
            <strong>
              {outageCount ?? <span aria-label="Nombre inconnu">—</span>}
              <small> / {zones.length}</small>
            </strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon amber">
            <Zap size={28} />
          </span>
          <div className="stat-copy">
            <span className="stat-label">Energy nearby</span>
            <strong>
              {offerCount}
              <small> offers</small>
            </strong>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-icon green">
            <Users size={28} />
          </span>
          <div className="stat-copy">
            <span className="stat-label">Contributions</span>
            <strong>
              {reportCount}
              <small> reports</small>
            </strong>
          </div>
        </article>
      </section>
      <div className="dashboard-content">
        {display.visible.offers && (
          <section
            className="dashboard-section"
            style={{ order: display.order.indexOf("offers") }}
          >
            <div className="section-heading">
              <h2>
                <Zap size={18} />
                Energy nearby
                <span className="section-count">{offerCount}</span>
              </h2>
              <Link href="/sharing" className="text-button">
                See all
                <ChevronRight size={16} />
              </Link>
            </div>
            {offers.length ? (
              <div
                className="energy-rail"
                aria-label="Energy offers nearby"
                tabIndex={0}
              >
                {offers}
              </div>
            ) : (
              <div className="panel empty-state">
                <Zap size={28} />
                <h3>No offers for this search</h3>
                <button className="text-button" onClick={onClearSearch}>
                  Clear search
                </button>
              </div>
            )}
          </section>
        )}
        {display.visible.network && (
          <section
            className="dashboard-section network-section"
            style={{ order: display.order.indexOf("network") }}
          >
            <div className="section-heading">
              <h2>
                <Map size={18} />
                Your neighbourhood’s grid
              </h2>
              <Link href="/map" className="text-button">
                Explore the map
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="network-grid">
              {map}
              <section className="panel network-zones">
                <div className="panel-heading">
                  <h2>Pilot neighbourhoods</h2>
                  <span className="tiny-tag">{zones.length} ZONES</span>
                </div>
                <div className="network-zone-list">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      className={zone.id === selectedId ? "selected" : ""}
                      aria-label={`${zone.name}, ${zone.reports} reports, ${statusLabels[zone.status]}`}
                      aria-pressed={zone.id === selectedId}
                      onClick={() => onSelect(zone.id)}
                    >
                      <span className={`zone-color ${zone.status}`} />
                      <span className="zone-title">
                        {zone.name}
                        <small>{zone.reports} reports</small>
                      </span>
                      <Status status={zone.status} />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}
        {display.visible.insights && (
          <section
            className="dashboard-section"
            style={{ order: display.order.indexOf("insights") }}
          >
            <div className="section-heading">
              <h2>
                <Clock3 size={18} />
                Forecast and latest contributions
              </h2>
              <Link href="/community" className="text-button">
                All activity
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="bottom-grid">
              {prediction}
              <section className="panel community-card">
                <div className="panel-heading">
                  <h2>
                    <Radio size={16} />
                    The neighbourhood keeps you informed
                  </h2>
                  <span className="tiny-tag">COMMUNITY</span>
                </div>
                {community}
                <Link href="/community" className="text-button">
                  View reports
                  <ArrowRight size={14} />
                </Link>
              </section>
            </div>
          </section>
        )}
        {!Object.values(display.visible).some(Boolean) && (
          <div className="panel empty-state">
            <LayoutDashboard size={30} />
            <h3>Your space, your way.</h3>
            <p>Choose your sections with “Edit layout”.</p>
            <button
              className="button secondary"
              onClick={() =>
                updateDisplay((previous) => ({
                  ...defaultDisplay,
                  theme: previous.theme,
                  collapsed: previous.collapsed,
                  neighborhoodsOpen: previous.neighborhoodsOpen,
                }))
              }
            >
              Restore sections
            </button>
          </div>
        )}
      </div>
    </>
  );
}
