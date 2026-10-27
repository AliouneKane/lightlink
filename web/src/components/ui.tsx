"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { Neighborhood } from "@/lib/energy";
import type { ZoneForecast } from "../../../shared/forecast";

export const statusLabels = {
  powered: "Power available",
  outage: "Outage reported",
  unstable: "Likely outage",
  unknown: "Unknown status",
};
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <Image src="/lightlink-mark.svg" width={38} height={38} alt="" priority />
      {!compact && (
        <span>
          Light<span>Link</span>
          <small>ENERGY CONNECTS US</small>
        </span>
      )}
    </span>
  );
}

export function Status({ status }: { status: Neighborhood["status"] }) {
  return (
    <span className={`status-pill ${status}`}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const original = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = original;
      // React removes the dialog before native focus restoration completes.
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby="modal-title"
      onCancel={() => onClose()}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-content">
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function EnergyArtwork() {
  return (
    <svg
      className="energy-artwork"
      viewBox="0 0 320 170"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="213" cy="89" r="77" stroke="#DAE4DD" />
      <circle cx="213" cy="89" r="55" stroke="#D0DDD5" strokeDasharray="3 7" />
      <path
        d="M80 122h57m63-43h70m-93 0v43h44m-44-43V44h42"
        stroke="#98ADA3"
        strokeWidth="2"
        strokeDasharray="4 5"
      />
      <rect x="167" y="50" width="56" height="64" rx="18" fill="#FFC84B" />
      <path d="m198 62-19 25h15l-3 18 21-27h-15l1-16Z" fill="#203C32" />
      <rect x="56" y="105" width="43" height="34" rx="6" fill="#FFF" />
      <path
        d="m51 107 27-21 26 21"
        stroke="#243F35"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M74 139v-16h10v16" stroke="#243F35" strokeWidth="2" />
      <rect x="249" y="61" width="43" height="36" rx="8" fill="#FFF" />
      <path
        d="M260 70h20v16h-20zm0 8h20m-10-8v16"
        stroke="#243F35"
        strokeWidth="2"
      />
      <circle cx="221" cy="37" r="16" fill="#FFF" />
      <path
        d="m215 37 4 4 8-8"
        stroke="#489175"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="141" cy="129" r="6" fill="#92B4A0" />
      <circle cx="259" cy="132" r="5" fill="#FBC953" />
      <path
        d="M282 29v12m-6-6h12M114 64v10m-5-5h10"
        stroke="#A4BCAE"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RiskChart({
  forecast,
  detailed = false,
}: {
  forecast: ZoneForecast;
  detailed?: boolean;
}) {
  const values = forecast.riskValues;
  return (
    <div
      className={`risk-chart ${detailed ? "detailed" : ""}`}
      role="img"
      aria-label={forecast.chartDescription}
    >
      {detailed && (
        <div className="chart-grid">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
      )}
      <div className="chart-bars">
        {values.map((value, index) => (
          <div
            key={index}
            className={
              index >= forecast.peakStartIndex && index <= forecast.peakEndIndex
                ? "peak"
                : ""
            }
            style={{ height: `${value}%` }}
          >
            <span>{value}%</span>
          </div>
        ))}
      </div>
      <div className="chart-hours">
        {forecast.hourLabels.map((hour) => (
          <span key={hour}>{hour}</span>
        ))}
      </div>
    </div>
  );
}
