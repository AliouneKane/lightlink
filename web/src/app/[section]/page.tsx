import { notFound } from "next/navigation";
import { LightLinkApp } from "@/components/lightlink-app";
import { neighborhoods } from "@/lib/energy";

const sections = ["map", "forecast", "sharing", "community", "settings"];

export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ zone?: string; source?: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  const { zone: zoneParam, source } = await searchParams;
  const initialNeighborhood = neighborhoods.some(
    (zone) => zone.id === zoneParam,
  )
    ? zoneParam
    : undefined;
  const initialSource =
    source === "solar" || source === "generator" || source === "battery"
      ? source
      : undefined;
  return (
    <LightLinkApp
      key={`${section}-${initialNeighborhood ?? "default"}-${initialSource ?? "all"}`}
      initialNeighborhood={initialNeighborhood}
      initialSource={initialSource}
    />
  );
}
