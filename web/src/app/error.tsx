"use client";

import Image from "next/image";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone-state">
      <Image src="/lightlink-mark.svg" alt="" width={48} height={48} />
      <h1>Cette page n’a pas pu s’afficher.</h1>
      <p>Vos contributions enregistrées sur cet appareil seront conservées.</p>
      <button className="button primary" onClick={reset}>
        Réessayer
      </button>
    </main>
  );
}
