import { defineConfig } from "vite";
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

      html.source = source;
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), inlineEntryCss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "admin-pages", test: /src[\\/]pages[\\/]admin[\\/]/ },
            { name: "host-pages", test: /src[\\/]pages[\\/](Host|BecomeHost|AddTripPackage|EditTripPackage|EditListing|AddProperty)/ },
            { name: "booking-pages", test: /src[\\/]pages[\\/](Checkout|Booking|Trip|Experience|Service|Refund|Payment|Receipt)/ },
            { name: "react-vendor", test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/ },
            { name: "maps-vendor", test: /node_modules[\\/](@react-google-maps|@googlemaps)[\\/]/ },
            { name: "ui-vendor", test: /node_modules[\\/](lucide-react|react-hot-toast)[\\/]/ },
            { name: "network-vendor", test: /node_modules[\\/](axios|socket\.io-client)[\\/]/ },
          ],
        },
      },
    },
  },
});
