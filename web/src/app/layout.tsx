import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LightLink — L’énergie nous relie",
  description:
    "Anticipez les coupures et partagez l’énergie dans votre quartier. La solidarité énergétique, à Accra.",
  icons: { icon: "/lightlink-mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
