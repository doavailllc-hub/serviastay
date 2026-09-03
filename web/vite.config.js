import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function inlineEntryCss() {
  return {
    name: "inline-entry-css",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = bundle["index.html"];
      if (!html || html.type !== "asset") return;

      let source = String(html.source);
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type !== "asset" || !fileName.endsWith(".css")) continue;

        const href = `/${fileName}`;
        const stylesheetPattern = new RegExp(
          `<link[^>]+href=["']${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
        );

        if (!stylesheetPattern.test(source)) continue;
        source = source.replace(stylesheetPattern, `<style>${String(asset.source)}</style>`);
        delete bundle[fileName];
      }

      const primaryFont = Object.keys(bundle).find(
        (fileName) => fileName.includes("inter-latin-600-normal") && fileName.endsWith(".woff2"),
      );
      if (primaryFont) {
        source = source.replace(
          "</head>",
          `<link rel="preload" href="/${primaryFont}" as="font" type="font/woff2" crossorigin>\n</head>`,
        );
      }

      html.source = source;
    },
  };
}

function homepageLcpPreload(apiUrl) {
  return {
    name: "homepage-lcp-preload",
    transformIndexHtml: {
      order: "pre",
      async handler() {
        try {
          const response = await fetch(`${apiUrl}/properties`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!response.ok) return [];

          const payload = await response.json();
          const properties = Array.isArray(payload)
            ? payload
            : payload.properties || payload.data || [];
          const property = properties[0];
          const image = property?.image || property?.image_url || property?.cover_image;
          if (!image || !image.includes(".s3.") || !/\/properties\//.test(image)) return [];

          const href = image.replace(/\.[^./?]+(?=\?|$)/, "-320.webp");
          return [{
            tag: "link",
            attrs: { rel: "preload", as: "image", href, type: "image/webp", fetchpriority: "high" },
            injectTo: "head",
          }];
        } catch {
          return [];
        }
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const siteUrl = env.VITE_SITE_URL || env.VITE_APP_URL || "https://stay.dovail.com";
  const apiUrl = (env.VITE_API_URL || `${siteUrl}/api`).replace(/\/$/, "");

  return {
  plugins: [react(), tailwindcss(), homepageLcpPreload(apiUrl), inlineEntryCss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "react-vendor", test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/ },
            { name: "maps-vendor", test: /node_modules[\\/](@react-google-maps|@googlemaps)[\\/]/ },
            { name: "ui-vendor", test: /node_modules[\\/](lucide-react|react-hot-toast)[\\/]/ },
            { name: "network-vendor", test: /node_modules[\\/](axios|socket\.io-client)[\\/]/ },
          ],
        },
      },
    },
  },
  };
});
