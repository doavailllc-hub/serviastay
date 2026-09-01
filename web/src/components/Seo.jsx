import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SEO_SITE_URL } from "../utils/seoConfig";

const SITE_URL = SEO_SITE_URL;
const SITE_NAME = "Dovail Stay";
const DEFAULT_IMAGE = `${SITE_URL}/favicon.svg`;
const DEFAULT_DESCRIPTION =
  "Discover trusted stays, curated trip experiences, and local services with Dovail Stay.";

const PUBLIC_META = {
  "/": {
    title: "Dovail Stay | Stays, Trips and Local Experiences",
    description: "Book trusted stays, curated trips, and useful local services for your next journey with Dovail Stay.",
  },
  "/experiences": {
    title: "Curated Trips and Experiences | Dovail Stay",
    description: "Explore curated tours, activities, and travel packages with clear inclusions, dates, and pricing.",
  },
  "/services": {
    title: "Trusted Services for Your Stay | Dovail Stay",
    description: "Book airport transfers, chefs, cleaning, wellness, family care, and other trusted local services.",
  },
  "/help": {
    title: "Help Center | Dovail Stay",
    description: "Find answers about bookings, payments, cancellations, hosting, and your Dovail Stay account.",
  },
  "/support": {
    title: "Customer Support | Dovail Stay",
    description: "Get support for Dovail Stay bookings, payments, refunds, and account questions.",
  },
  "/privacy": {
    title: "Privacy Policy | Dovail Stay",
    description: "Read how Dovail Stay collects, uses, and protects personal information.",
  },
  "/terms": {
    title: "Terms and Conditions | Dovail Stay",
    description: "Review the terms that apply when using Dovail Stay services.",
  },
};

const NOINDEX_PREFIXES = [
  "/admin", "/login", "/signup", "/forgot-password", "/checkout",
  "/booking-success", "/experience-checkout", "/experience-booking-success",
  "/profile", "/account-settings", "/wishlist", "/trips", "/trip/",
  "/messages", "/notifications", "/receipt/", "/payments", "/payouts",
  "/refund", "/host", "/add-", "/edit-", "/verification", "/security",
  "/language", "/category", "/recently-viewed", "/write-review/",
  "/service-booking", "/experience-bookings", "/search-results",
];

function setMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
}

function absoluteUrl(value) {
  if (!value) return DEFAULT_IMAGE;
  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return DEFAULT_IMAGE;
  }
}

export function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  image = DEFAULT_IMAGE,
  type = "website",
  noindex = false,
  jsonLd,
}) {
  const location = useLocation();

  useEffect(() => {
    const canonical = new URL(canonicalPath || location.pathname, SITE_URL).toString();
    const safeTitle = title || SITE_NAME;
    const safeDescription = String(description || DEFAULT_DESCRIPTION).replace(/\s+/g, " ").trim().slice(0, 160);
    const safeImage = absoluteUrl(image);

    document.title = safeTitle;
    setMeta('meta[name="description"]', { name: "description", content: safeDescription });
    setMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    });
    setMeta('meta[property="og:title"]', { property: "og:title", content: safeTitle });
    setMeta('meta[property="og:description"]', { property: "og:description", content: safeDescription });
    setMeta('meta[property="og:type"]', { property: "og:type", content: type });
    setMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    setMeta('meta[property="og:image"]', { property: "og:image", content: safeImage });
    setMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: safeTitle });
    setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: safeDescription });
    setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: safeImage });

    let canonicalElement = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalElement) {
      canonicalElement = document.createElement("link");
      canonicalElement.rel = "canonical";
      document.head.appendChild(canonicalElement);
    }
    canonicalElement.href = canonical;

    const scriptId = "page-structured-data";
    document.getElementById(scriptId)?.remove();
    if (jsonLd && !noindex) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd).replace(/</g, "\\u003c");
      document.head.appendChild(script);
    }
  }, [canonicalPath, description, image, jsonLd, location.pathname, noindex, title, type]);

  return null;
}

export function RouteSeo() {
  const { pathname } = useLocation();
  const normalizedPath = pathname === "/home" ? "/" : pathname;
  const isStay = /^\/reserve\/[^/]+$/.test(pathname);
  const isExperience = /^\/experiences\/[^/]+$/.test(pathname);
  const isService = /^\/service\/[^/]+$/.test(pathname);
  const isKnownPublic = Boolean(PUBLIC_META[normalizedPath] || isStay || isExperience || isService);
  const noindex = NOINDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix)) || !isKnownPublic;
  const meta = PUBLIC_META[normalizedPath] || {
    title: isStay
      ? "Stay Details | Dovail Stay"
      : isExperience
        ? "Trip Experience | Dovail Stay"
        : isService
          ? "Local Service | Dovail Stay"
          : "Dovail Stay",
    description: DEFAULT_DESCRIPTION,
  };

  const homeSchema = normalizedPath === "/" ? [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: DEFAULT_IMAGE,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  ] : undefined;

  return (
    <Seo
      {...meta}
      canonicalPath={normalizedPath}
      noindex={noindex}
      jsonLd={homeSchema}
    />
  );
}
