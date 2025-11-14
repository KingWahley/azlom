import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function MapTracker({ driverPos, clientPos, route }) {
  const center = driverPos || clientPos || [9.0765, 7.3986];

  return (
    <div className="w-full h-80">
      <MapContainer
        center={center}
        zoom={13}
        className="h-80"
        scrollWheelZoom={true}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {driverPos && <Marker position={driverPos} />}

        {clientPos && <Marker position={clientPos} />}

        {route && Array.isArray(route) && route.length > 1 && (
          <Polyline positions={route.map((p) => [p.lat, p.lng])} />
        )}
      </MapContainer>
    </div>
  );
}
