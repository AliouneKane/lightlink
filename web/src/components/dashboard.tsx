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
      <section className="stats-grid" aria-label="Indicateurs de démonstration">
        <article className="stat-card">
          <span className="stat-icon blue">
            <MapPin size={28} />
          </span>
          <div className="stat-copy">
            <span className="stat-label">Votre quartier</span>
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
            <span className="stat-label">Quartiers sans courant</span>
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
            <span className="stat-label">Énergie à proximité</span>
            <strong>
              {offerCount}
              <small> offres</small>
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
              <small> signalements</small>
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
                Énergie à proximité
                <span className="section-count">{offerCount}</span>
              </h2>
              <Link href="/partage" className="text-button">
                Tout voir
                <ChevronRight size={16} />
              </Link>
            </div>
            {offers.length ? (
              <div
                className="energy-rail"
                aria-label="Offres d’énergie à proximité"
                tabIndex={0}
              >
                {offers}
              </div>
            ) : (
              <div className="panel empty-state">
                <Zap size={28} />
                <h3>Aucune offre pour cette recherche</h3>
                <button className="text-button" onClick={onClearSearch}>
                  Effacer la recherche
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
                Le réseau de votre quartier
              </h2>
              <Link href="/carte" className="text-button">
                Explorer la carte
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="network-grid">
              {map}
              <section className="panel network-zones">
                <div className="panel-heading">
                  <h2>Quartiers pilotes</h2>
                  <span className="tiny-tag">{zones.length} ZONES</span>
                </div>
                <div className="network-zone-list">
                  {zones.map((zone) => (
                    <button
                      key={zone.id}
                      className={zone.id === selectedId ? "selected" : ""}
                      aria-label={`${zone.name}, ${zone.reports} signalements, ${statusLabels[zone.status]}`}
                      aria-pressed={zone.id === selectedId}
                      onClick={() => onSelect(zone.id)}
                    >
                      <span className={`zone-color ${zone.status}`} />
                      <span className="zone-title">
                        {zone.name}
                        <small>{zone.reports} signalements</small>
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
                Prévisions et dernières contributions
              </h2>
              <Link href="/communaute" className="text-button">
                Toute l’activité
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className="bottom-grid">
              {prediction}
              <section className="panel community-card">
                <div className="panel-heading">
                  <h2>
                    <Radio size={16} />
                    Le quartier vous informe
                  </h2>
                  <span className="tiny-tag">COMMUNAUTÉ</span>
                </div>
                {community}
                <Link href="/communaute" className="text-button">
                  Voir les signalements
                  <ArrowRight size={14} />
                </Link>
              </section>
            </div>
          </section>
        )}
        {!Object.values(display.visible).some(Boolean) && (
          <div className="panel empty-state">
            <LayoutDashboard size={30} />
            <h3>Votre espace, à votre façon.</h3>
            <p>Choisissez vos sections avec « Modifier la disposition ».</p>
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
              Rétablir les sections
            </button>
          </div>
        )}
      </div>
    </>
  );
}
