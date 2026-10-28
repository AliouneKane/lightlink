import type { NextConfig } from "next";
import path from "node:path";

// Section URLs of the French interface, kept working for bookmarks and shared links.
const frenchSections = {
  carte: "map",
  previsions: "forecast",
  partage: "sharing",
  communaute: "community",
  parametres: "settings",
};

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Include the framework-free model used by both frontends.
  turbopack: { root: path.join(__dirname, "..") },
  async redirects() {
    const sections = [
      ...Object.entries(frenchSections),
      ...Object.values(frenchSections).map((section) => [section, section]),
    ];
    return sections.flatMap(([from, to]) => [
      // ?quartier= became ?zone=; the original query is passed through as well.
      {
        source: `/${from}`,
        has: [
          { type: "query" as const, key: "quartier", value: "(?<zone>.*)" },
        ],
        missing: [{ type: "query" as const, key: "zone" }],
        destination: `/${to}?zone=:zone`,
        permanent: true,
      },
      ...(from === to
        ? []
        : [{ source: `/${from}`, destination: `/${to}`, permanent: true }]),
    ]);
  },
};

export default nextConfig;
