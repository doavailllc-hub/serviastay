import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

export default function GoogleMapSection({
  latitude,
  longitude,
  title,
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  if (!latitude || !longitude) {
    return (
      <div className="flex h-80 items-center justify-center rounded-[28px] border">
        Location unavailable
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-80 items-center justify-center rounded-[28px] border">
        Loading map...
      </div>
    );
  }

  const center = {
    lat: Number(latitude),
    lng: Number(longitude),
  };

  return (
    <GoogleMap
      center={center}
      zoom={14}
      mapContainerStyle={{
        width: "100%",
        height: "320px",
        borderRadius: "28px",
      }}
    >
      <Marker
        position={center}
        title={title}
      />
    </GoogleMap>
  );
}