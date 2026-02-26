import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const BASE_URL = "https://inkoo.eu";
const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c24cc5ad-c435-4e5d-b5ef-25f5379805a4/id-preview-137ba4fc--19dce87e-1fb1-4b01-aa72-be8f55cc6742.lovable.app-1771531263457.png";

const LOCALE_MAP: Record<string, string> = { fr: "fr_BE", nl: "nl_BE", en: "en_US" };

interface SEOHeadProps {
  title: string;
  description: string;
  path?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
}

function upsertMeta(attr: string, key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string, extra?: Record<string, string>) {
  const selector = extra
    ? `link[rel="${rel}"][hreflang="${extra.hreflang}"]`
    : `link[rel="${rel}"]`;
  let el = document.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (extra) Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const SEOHead = ({ title, description, path = "/", jsonLd, noIndex }: SEOHeadProps) => {
  const { i18n } = useTranslation();
  const lang = i18n.language || "fr";
  const fullTitle = `${title} — INKOO B2B`;
  const url = `${BASE_URL}${path}`;

  useEffect(() => {
    document.title = fullTitle;
    document.documentElement.lang = lang;

    // Basic meta
    upsertMeta("name", "description", description);
    if (noIndex) upsertMeta("name", "robots", "noindex, nofollow");

    // Open Graph
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", OG_IMAGE);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:locale", LOCALE_MAP[lang] || "fr_BE");
    upsertMeta("property", "og:site_name", "INKOO B2B");

    // Twitter
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", OG_IMAGE);
    upsertMeta("name", "twitter:card", "summary_large_image");

    // Canonical
    upsertLink("canonical", url);

    // Hreflang alternates
    ["fr", "nl", "en"].forEach((lng) => {
      upsertLink("alternate", `${BASE_URL}${path}`, { hreflang: lng });
    });
    upsertLink("alternate", `${BASE_URL}${path}`, { hreflang: "x-default" });

    // GEO meta
    upsertMeta("name", "geo.region", "BE-BRU");
    upsertMeta("name", "geo.placename", "Brussels");
    upsertMeta("name", "geo.position", "50.8503;4.3517");
    upsertMeta("name", "ICBM", "50.8503, 4.3517");

    // JSON-LD
    const scriptId = "seo-jsonld";
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = scriptId;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      const data = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      scriptEl.textContent = JSON.stringify(data.length === 1 ? data[0] : data);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Cleanup JSON-LD on unmount
      document.getElementById(scriptId)?.remove();
    };
  }, [fullTitle, description, url, lang, jsonLd, noIndex]);

  return null;
};

export default SEOHead;
