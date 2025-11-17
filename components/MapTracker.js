import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
} from "react-leaflet";
import L from "leaflet";

// -------------------------------------
// CUSTOM MARKERS
// -------------------------------------
const clientIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2554/2554978.png",
  iconSize: [45, 45],
  iconAnchor: [22, 45],
});

export default function MapTracker({ driverPos, clientPos, route }) {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div
      className={`w-full ${
        fullscreen ? "fixed inset-0 bg-white z-[99999] p-0" : ""
      }`}
    >
      {/* Fullscreen Button (Top-right) */}
      <button
        onClick={() => setFullscreen(!fullscreen)}
        className="absolute top-3 right-3 bg-white px-3 py-1 rounded shadow z-[100000]"
      >
        {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>

      <MapContainer
        center={clientPos}
        zoom={15}
        style={{
          height: fullscreen ? "100vh" : "350px",
          width: "100%",
        }}
        className="rounded overflow-hidden"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Client Marker */}
        {clientPos && <Marker position={clientPos} icon={clientIcon} />}

        {/* Driver Marker */}
        {driverPos && <Marker position={driverPos} icon={driverIcon} />}

        {/* Route */}
        {route && route.length > 1 && (
          <Polyline
            positions={route}
            pathOptions={{ color: "#2563eb", weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
