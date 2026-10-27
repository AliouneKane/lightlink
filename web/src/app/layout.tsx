import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LightLink — Energy connects us",
  description:
    "See outages coming and share energy in your neighbourhood. Energy solidarity, in Accra.",
  icons: { icon: "/lightlink-mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
