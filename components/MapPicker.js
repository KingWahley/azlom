import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Recenter map
function Recenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 16);
  }, [coords]);
  return null;
}

// Marker
function ClickMarker({ pos, setPos }) {
  useMapEvents({
    click(e) {
      setPos([e.latlng.lat, e.latlng.lng]);
    },
  });
  return pos ? <Marker position={pos} /> : null;
}

export default function MapPicker({ value, onChange }) {
  const [pos, setPos] = useState(value || [9.0765, 7.3986]); // Default Abuja
  const [query, setQuery] = useState("");

  useEffect(() => {
    onChange?.(pos);
  }, [pos]);

  // -------------------------------
  // 🔍 SEARCH HANDLER
  // -------------------------------
  const search = async () => {
    if (!query) return;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.length) {
        const loc = data[0];
        setPos([parseFloat(loc.lat), parseFloat(loc.lon)]);
      } else {
        alert("Location not found");
      }
    } catch (err) {
      alert("Search error, try again");
    }
  };

  // -------------------------------
  // 📌 USE MY LOCATION BUTTON
  // -------------------------------
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      return alert("Your device does not support location access");
    }

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude, longitude } = p.coords;
        setPos([latitude, longitude]);
      },
      () => alert("Unable to fetch your location"),
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="w-full">

      {/* SEARCH + BUTTON */}
      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address"
          className="border rounded p-2 flex-1 bg-white text-black"
        />
        <button
          onClick={search}
          className="bg-slate-800 text-white px-4 rounded"
        >
          Search
        </button>
      </div>

      {/* USE MY LOCATION BUTTON (standalone) */}
      <button
        onClick={useMyLocation}
        className="mb-3 bg-blue-600 text-white px-4 py-2 rounded shadow w-full"
      >
        Use My Current Location
      </button>

      {/* MAP */}
      <MapContainer
        center={pos}
        zoom={13}
        style={{ height: "350px", width: "100%" }}
        className="rounded overflow-hidden"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Recenter coords={pos} />
        <ClickMarker pos={pos} setPos={setPos} />
      </MapContainer>

      <div className="mt-2 text-sm">
        Selected:{" "}
        <strong>
          {pos[0].toFixed(6)}, {pos[1].toFixed(6)}
        </strong>
      </div>
    </div>
  );
}
