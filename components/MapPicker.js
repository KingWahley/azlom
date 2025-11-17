import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";

// Fix default Leaflet marker icons (CDN)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Reverse geocode
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": "azlom-app" } });
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

// Search suggestions (Photon)
async function searchSuggestions(q, limit = 6) {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      q
    )}&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.features || [];
  } catch {
    return [];
  }
}

// Recenter map
function Recenter({ coords, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!coords || !map) return;
    if (map.flyTo) {
      map.flyTo(coords, zoom ?? map.getZoom(), { duration: 0.6 });
      setTimeout(() => map.invalidateSize(), 350);
    }
  }, [coords?.[0], coords?.[1], zoom, map]);
  return null;
}

// Click to set marker
function ClickMarker({ pos, setPos }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPos([lat, lng]);
    },
  });
  return pos ? <Marker position={pos} /> : null;
}

export default function MapPicker({ value, onChange }) {
  const initial =
    Array.isArray(value) && value.length === 2 ? value : [9.0765, 7.3986];

  const [pos, setPos] = useState(initial);
  const [address, setAddress] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingAddr, setLoadingAddr] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const mapRef = useRef(null);
  const suggestionsRef = useRef(null);

  // notify parent
  useEffect(() => {
    onChange?.(pos);
  }, [pos]);

  // reverse lookup
  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      setLoadingAddr(true);
      const a = await reverseGeocode(pos[0], pos[1]);
      if (active) setAddress(a || "Address not found");
      setLoadingAddr(false);
    }, 300);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [pos]);

  // input search
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSearch(true);
    const t = setTimeout(async () => {
      const results = await searchSuggestions(query, 6);
      setSuggestions(results);
      setLoadingSearch(false);
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  // suggestion clicked
  const selectSuggestion = (s) => {
    try {
      const [lng, lat] = s.geometry.coordinates;
      setPos([lat, lng]);
      setQuery(s.properties.label || s.properties.name || "");
      setSuggestions([]);

      const map = mapRef.current;
      if (map && map.flyTo) {
        map.flyTo([lat, lng], 16, { duration: 0.6 });
        setTimeout(() => map.invalidateSize(), 300);
      }
    } catch {}
  };

  // manual search (Nominatim)
  const runSearch = async () => {
    if (!query) return alert("Type an address first");
    setLoadingSearch(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.length) return alert("Location not found");

      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      setPos([lat, lon]);

      const map = mapRef.current;
      if (map && map.flyTo) {
        map.flyTo([lat, lon], 16, { duration: 0.6 });
        setTimeout(() => map.invalidateSize(), 300);
      }

      setSuggestions([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  // use current location
  const useMyLocation = () => {
    if (!navigator.geolocation) return alert("Location not supported");

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        setPos([lat, lon]);

        const map = mapRef.current;
        if (map && map.flyTo) {
          map.flyTo([lat, lon], 16, { duration: 0.6 });
          setTimeout(() => map.invalidateSize(), 300);
        }
      },
      () => alert("Unable to fetch your location"),
      { enableHighAccuracy: true }
    );
  };

  // Draggable marker
  function DraggableMarker() {
    const markerRef = useRef(null);
    const map = useMap();

    useEffect(() => {
      if (!mapRef.current) mapRef.current = map;
    }, [map]);

    useEffect(() => {
      if (!markerRef.current) return;
      markerRef.current.setLatLng(pos);
    }, [pos]);

    return (
      <Marker
        draggable
        position={pos}
        ref={markerRef}
        eventHandlers={{
          dragend() {
            const m = markerRef.current;
            if (!m) return;
            const p = m.getLatLng();
            setPos([p.lat, p.lng]);
          },
        }}
      />
    );
  }

  // fullscreen mode
  const toggleFullscreen = () => {
    setFullscreen((f) => {
      const next = !f;
      setTimeout(() => {
        const map = mapRef.current;
        if (map) map.invalidateSize();
      }, 150);
      return next;
    });
  };

  // click outside suggestions to close
  useEffect(() => {
    const h = (e) => {
      if (!suggestionsRef.current) return;
      if (!suggestionsRef.current.contains(e.target)) setSuggestions([]);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  return (
    <div
      className={`${fullscreen ? "fixed inset-0 bg-white z-[99999]" : ""} w-full`}
    >
      {!fullscreen && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search address"
              className="border rounded p-2 flex-1 bg-white text-black"
            />
            <button
              onClick={runSearch}
              className="bg-slate-800 text-white px-4 rounded"
            >
              {loadingSearch ? "…" : "Search"}
            </button>
          </div>

          <button
            onClick={useMyLocation}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow w-full"
          >
            Use My Current Location
          </button>
        </div>
      )}

      {/* suggestions */}
      {suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-4 right-4 max-w-4xl mx-auto mt-2 z-[100001] bg-white border rounded shadow overflow-auto relative"
          style={{ maxHeight: 280 }}
        >
          <button
            onClick={() => setSuggestions([])}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
          >
            ✕
          </button>

          {suggestions.map((s) => (
            <div
              key={s.properties.osm_id + (s.properties.label || "")}
              onClick={() => selectSuggestion(s)}
              className="p-2 cursor-pointer border-b hover:bg-gray-100 text-black"
            >
              <div className="text-sm font-medium">
                {s.properties.label || s.properties.name}
              </div>
              <div className="text-xs text-gray-500">
                {s.properties.city || s.properties.country || ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* map */}
      <div className="relative">
        <button
          onClick={toggleFullscreen}
          className="absolute top-3 right-3 z-[100002] bg-white px-3 py-1 rounded shadow"
        >
          {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>

        <MapContainer
          center={pos}
          zoom={16}
          whenCreated={(map) => (mapRef.current = map)}
          style={{ height: fullscreen ? "100vh" : 380, width: "100%" }}
          className="rounded overflow-hidden"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Recenter coords={pos} zoom={17} />
          <DraggableMarker />
          <ClickMarker pos={pos} setPos={setPos} />
        </MapContainer>
      </div>

      {/* address view */}
      <div
        className={`mt-3 p-3 rounded ${
          fullscreen
            ? "fixed bottom-4 left-4 right-4 bg-white shadow z-[100003]"
            : ""
        }`}
      >
        <div className="text-sm">
          <strong>Selected:</strong>{" "}
          {pos[0].toFixed(6)}, {pos[1].toFixed(6)}
        </div>
        <div className="text-sm mt-1">
          <strong>Address:</strong>{" "}
          {loadingAddr ? "Looking up…" : address || "No address found"}
        </div>
      </div>
    </div>
  );
}
