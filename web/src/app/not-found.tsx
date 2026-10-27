import Link from "next/link";

export default function NotFound() {
  return (
    <main className="standalone-state">
      <h1>This page does not exist.</h1>
      <Link className="button primary" href="/">
        Back to LightLink
      </Link>
    </main>
  );
}
