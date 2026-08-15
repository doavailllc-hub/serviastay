import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
