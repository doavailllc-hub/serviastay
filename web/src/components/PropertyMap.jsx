import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";

const containerStyle = {
  width: "100%",
  height: "100%",
};

export default function PropertyMap({ property }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const lat = Number(property?.latitude || 10.8505);
  const lng = Number(property?.longitude || 76.2711);

  const center = {
    lat,
    lng,
  };

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
  });

  if (!apiKey) {
    return (
      <FallbackMap
        title="Google Maps key missing"
        text="Add VITE_GOOGLE_MAPS_API_KEY in your React .env file."
        property={property}
      />
    );
  }

  if (loadError) {
    return (
      <FallbackMap
        title="Map failed to load"
        text="Please check your Google Maps API key and billing settings."
        property={property}
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-80 animate-pulse rounded-3xl bg-gray-200" />
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200">
      <div className="h-80 md:h-[420px]">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            zoomControl: true,
          }}
        >
          <Marker position={center} />
        </GoogleMap>
      </div>

      <div className="border-t bg-white p-5">
        <h3 className="font-bold text-gray-900">
          {property?.location || "Property location"}
        </h3>

        <p className="mt-1 text-sm text-gray-500">
          Exact location will be provided after booking confirmation.
        </p>
      </div>
    </div>
  );
}

function FallbackMap({ title, text, property }) {
  return (
    <div className="flex h-80 items-center justify-center rounded-3xl bg-[#F4F1FF] md:h-[420px]">
      <div className="px-6 text-center">
        <MapPin size={42} className="mx-auto mb-3 text-[#3b71e6]" />

        <h3 className="text-xl font-bold">
          {property?.location || title}
        </h3>

        <p className="mt-2 text-gray-500">
          {text}
        </p>
      </div>
    </div>
  );
}