import { Link } from "react-router-dom";
import { Seo } from "@/components/Seo";
export function NotFoundPage() {
  return (
    <main className="route-state">
      <Seo
        title="Page not found | Pavan Kumar"
        description="The requested page could not be found."
        noindex
      />
      <p className="eyebrow">
        <span>404</span>
      </p>
      <h1>That page isn’t here.</h1>
      <p>The address may have changed, or the page may no longer exist.</p>
      <Link className="portfolio-button button-primary" to="/">
        Return home
      </Link>
    </main>
  );
}
