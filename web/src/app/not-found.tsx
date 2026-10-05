import Link from "next/link";

export default function NotFound() {
  return (
    <main className="standalone-state">
      <h1>Cette page n’existe pas.</h1>
      <Link className="button primary" href="/">
        Revenir à LightLink
      </Link>
    </main>
  );
}
