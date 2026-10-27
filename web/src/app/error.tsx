"use client";

import Image from "next/image";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-state">
      <Image src="/lightlink-mark.svg" alt="" width={48} height={48} />
      <h1>This page could not be displayed.</h1>
      <p>Your contributions saved on this device will be kept.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
