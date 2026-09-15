import { useEffect } from "react";

type Props = { title: string; description: string; noindex?: boolean; canonicalPath?: string };
const productionOrigin = "https://pavankumarchintapalliportfolio.vercel.app";

export function Seo({ title, description, noindex = false, canonicalPath }: Props) {
  useEffect(() => {
    document.title = title;
    const meta = (selector: string, attributes: Record<string, string>) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement("meta");
        document.head.appendChild(element);
      }
      Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
    };
    meta('meta[name="description"]', { name: "description", content: description });
    meta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex, nofollow" : "index, follow",
    });
    meta('meta[property="og:title"]', { property: "og:title", content: title });
    meta('meta[property="og:description"]', { property: "og:description", content: description });
    meta('meta[property="og:type"]', { property: "og:type", content: "website" });
    meta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    if (canonicalPath) {
      let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = productionOrigin + canonicalPath;
    } else document.head.querySelector('link[rel="canonical"]')?.remove();
  }, [title, description, noindex, canonicalPath]);
  return null;
}
