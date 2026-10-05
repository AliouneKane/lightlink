"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { DomEvent, divIcon } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LocateFixed, Minus, Plus, RotateCcw } from "lucide-react";

export interface EnergyMapProps {
  neighborhoods: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    status: "powered" | "outage" | "unstable";
    reports: number;
  }[];
  offers: {
    id: string;
    title: string;
    lat: number;
    lng: number;
    source: "solar" | "generator" | "battery";
    available: boolean;
  }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  layer: "all" | "outages" | "energy";
  focus?: [number, number] | null;
}

const ACCRA: [number, number] = [5.59, -0.205];
const STATUS = {
  powered: { color: "#1b9e77", label: "Électricité disponible" },
  outage: { color: "#ee725b", label: "Coupure signalée" },
  unstable: { color: "#e9ad44", label: "Réseau instable" },
};
const SOURCE = {
  solar: "Énergie solaire",
  generator: "Groupe électrogène",
  battery: "Batterie",
};

// Only trusted, static SVG is passed to Leaflet. Offer titles stay in React.
const lightningSvg =
  '<span class="map-pin-symbol"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m13 2-3 8H4l7 12 3-8h6L13 2Z"/></svg></span>';
const OFFER_ICONS = {
  available: divIcon({
    className: "map-pin map-pin--available",
    html: lightningSvg,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  }),
  unavailable: divIcon({
    className: "map-pin map-pin--unavailable",
    html: lightningSvg,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  }),
};

function validPosition(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function MapViewport({
  latitude,
  longitude,
  targetId,
}: {
  latitude?: number;
  longitude?: number;
  targetId?: string;
}) {
  const map = useMap();
  const previousTarget = useRef<string | null>(null);

  useEffect(() => {
    const element = map.getContainer();
    element.setAttribute(
      "aria-label",
      "Carte interactive des quartiers et des offres d’énergie à Accra. Utilisez les flèches pour déplacer la carte.",
    );
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        map.invalidateSize({ pan: false, animate: false }),
      );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map]);

  useEffect(() => {
    if (
      latitude === undefined ||
      longitude === undefined ||
      !validPosition(latitude, longitude)
    ) {
      previousTarget.current = null;
      return;
    }
    const key = `${targetId ?? "focus"}:${latitude}:${longitude}`;
    if (previousTarget.current === key) return;
    previousTarget.current = key;
    map.flyTo([latitude, longitude], 14, {
      duration: 0.65,
      animate: !reducedMotion(),
    });
  }, [map, latitude, longitude, targetId]);

  return null;
}

function MapTools() {
  const controls = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(12);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    locationfound: (event) => {
      setLocating(false);
      setLocationError(null);
      setPosition([event.latlng.lat, event.latlng.lng]);
      map.flyTo(event.latlng, 14, {
        duration: 0.65,
        animate: !reducedMotion(),
      });
    },
    locationerror: () => {
      setLocating(false);
      setLocationError(
        "Localisation indisponible. Vérifiez l’autorisation de votre navigateur.",
      );
    },
  });

  useEffect(() => {
    if (!controls.current) return;
    DomEvent.disableClickPropagation(controls.current);
    DomEvent.disableScrollPropagation(controls.current);
    return () => {
      map.stopLocate();
    };
  }, [map]);

  return (
    <>
      <div
        className="map-tools"
        ref={controls}
        aria-label="Contrôles de la carte"
      >
        <button
          type="button"
          className="map-tool-button"
          title="Zoom avant"
          aria-label="Zoom avant"
          disabled={zoom >= 19}
          onClick={() => map.zoomIn()}
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          className="map-tool-button"
          title="Zoom arrière"
          aria-label="Zoom arrière"
          disabled={zoom <= 3}
          onClick={() => map.zoomOut()}
        >
          <Minus size={18} />
        </button>
        <span className="map-tools-separator" aria-hidden="true" />
        <button
          type="button"
          className="map-tool-button"
          title="Me localiser"
          aria-label={locating ? "Localisation en cours" : "Me localiser"}
          disabled={locating}
          aria-busy={locating}
          onClick={() => {
            setLocationError(null);
            setLocating(true);
            map.locate({
              setView: false,
              timeout: 12000,
              maximumAge: 60000,
              enableHighAccuracy: false,
            });
          }}
        >
          <LocateFixed size={18} />
        </button>
        <button
          type="button"
          className="map-tool-button"
          title="Recentrer sur Accra"
          aria-label="Recentrer sur Accra"
          onClick={() => {
            setLocationError(null);
            map.flyTo(ACCRA, 12, { duration: 0.65, animate: !reducedMotion() });
          }}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      {locationError && (
        <div className="map-status map-status--location" role="status">
          {locationError}
        </div>
      )}
      {position && (
        <CircleMarker
          center={position}
          radius={7}
          pathOptions={{
            color: "#fff",
            weight: 3,
            fillColor: "#426be8",
            fillOpacity: 1,
          }}
        >
          <Tooltip>Votre position</Tooltip>
        </CircleMarker>
      )}
    </>
  );
}

export default function EnergyMap({
  neighborhoods,
  offers,
  selectedId,
  onSelect,
  layer,
  focus,
}: EnergyMapProps) {
  const [tileStatus, setTileStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const tileErrors = useRef(0);
  const tileSuccesses = useRef(0);
  const selected =
    neighborhoods.find((item) => item.id === selectedId) ??
    offers.find((item) => item.id === selectedId);
  const latitude = focus?.[0] ?? selected?.lat;
  const longitude = focus?.[1] ?? selected?.lng;
  const visibleNeighborhoods =
    layer === "energy"
      ? []
      : neighborhoods.filter(
          (item) => layer !== "outages" || item.status !== "powered",
        );
  const visibleOffers = layer === "outages" ? [] : offers;

  useEffect(() => {
    if (tileStatus !== "loading") return;
    const timeout = window.setTimeout(
      () => setTileStatus(tileSuccesses.current > 0 ? "ready" : "error"),
      12000,
    );
    return () => window.clearTimeout(timeout);
  }, [tileStatus]);

  return (
    <div
      className={`map-canvas${tileStatus === "error" ? " map-canvas--offline" : ""}`}
    >
      <MapContainer
        className="map-leaflet"
        center={ACCRA}
        zoom={12}
        minZoom={3}
        maxZoom={19}
        zoomControl={false}
        scrollWheelZoom={false}
        keyboard
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          eventHandlers={{
            loading: () => {
              tileErrors.current = 0;
              tileSuccesses.current = 0;
              setTileStatus("loading");
            },
            tileload: () => {
              tileSuccesses.current += 1;
            },
            tileerror: () => {
              tileErrors.current += 1;
            },
            load: () => {
              setTileStatus(
                tileErrors.current > 0 && tileSuccesses.current === 0
                  ? "error"
                  : "ready",
              );
            },
          }}
        />
        <MapViewport
          latitude={latitude}
          longitude={longitude}
          targetId={focus ? "focus" : selectedId}
        />
        <MapTools />
        {visibleNeighborhoods
          .filter((area) => validPosition(area.lat, area.lng))
          .map((area) => {
            const state = STATUS[area.status];
            const selectedArea = area.id === selectedId;
            return (
              <Fragment key={area.id}>
                <CircleMarker
                  center={[area.lat, area.lng]}
                  radius={selectedArea ? 30 : 23}
                  interactive={false}
                  pathOptions={{
                    stroke: false,
                    fillColor: state.color,
                    fillOpacity: selectedArea ? 0.22 : 0.12,
                  }}
                />
                <CircleMarker
                  center={[area.lat, area.lng]}
                  radius={selectedArea ? 10 : 7}
                  pathOptions={{
                    color: "#fff",
                    weight: 3,
                    fillColor: state.color,
                    fillOpacity: 1,
                  }}
                  eventHandlers={{ click: () => onSelect(area.id) }}
                >
                  <Tooltip
                    permanent
                    direction="top"
                    offset={[0, -10]}
                    className={`map-neighborhood-label${selectedArea ? " is-selected" : ""}`}
                  >
                    {area.name}
                  </Tooltip>
                  <Popup className="map-popup">
                    <strong>{area.name}</strong>
                    <p>{state.label}</p>
                    <span>
                      {area.reports} signalement{area.reports > 1 ? "s" : ""}
                    </span>
                    <button type="button" onClick={() => onSelect(area.id)}>
                      Voir ce quartier
                    </button>
                  </Popup>
                </CircleMarker>
              </Fragment>
            );
          })}
        {visibleOffers
          .filter((offer) => validPosition(offer.lat, offer.lng))
          .map((offer) => (
            <Marker
              key={offer.id}
              position={[offer.lat, offer.lng]}
              icon={OFFER_ICONS[offer.available ? "available" : "unavailable"]}
              title={offer.title}
              alt={offer.title}
              keyboard
              eventHandlers={{ click: () => onSelect(offer.id) }}
            >
              <Tooltip
                direction="top"
                offset={[0, -20]}
                permanent={tileStatus === "error"}
              >
                {offer.title}
              </Tooltip>
              <Popup className="map-popup">
                <strong>{offer.title}</strong>
                <p>{SOURCE[offer.source]}</p>
                <span>
                  {offer.available
                    ? "Énergie disponible"
                    : "Actuellement indisponible"}
                </span>
                <button type="button" onClick={() => onSelect(offer.id)}>
                  Voir l’offre
                </button>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
      <div className="map-overlay map-location-label">
        <span className="map-location-dot" aria-hidden="true" />
        ACCRA, GHANA
      </div>
      {tileStatus === "loading" && (
        <div className="map-status map-status--loading" role="status">
          Chargement de la carte…
        </div>
      )}
      {tileStatus === "error" && (
        <div className="map-status map-status--error" role="status">
          Le fond de carte est indisponible. Les quartiers et les points
          d’énergie restent consultables.
        </div>
      )}
    </div>
  );
}
