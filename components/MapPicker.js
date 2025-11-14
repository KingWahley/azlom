import { useState, useEffect } from "react"
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
} from "react-leaflet"
import L from "leaflet"

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })

  return position ? <Marker position={position} /> : null
}

export default function MapPicker({ value, onChange }) {
  const [pos, setPos] = useState(value || [9.0765, 7.3986]) // Default Nigeria

  useEffect(() => {
    if (pos) onChange(pos)
  }, [pos])

  const [query, setQuery] = useState("")

  const search = async () => {
    if (!query) return

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query
    )}`

    const res = await fetch(url)
    const data = await res.json()

    if (data && data.length) {
      const d = data[0]
      setPos([parseFloat(d.lat), parseFloat(d.lon)])
    }
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="flex gap-2 mb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search address"
          className="border rounded p-2 flex-1"
        />
        <button
          onClick={search}
          className="bg-slate-800 text-white px-3 rounded"
        >
          Search
        </button>
      </div>

      {/* Map */}
      <MapContainer center={pos} zoom={13} className="leaflet-container">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker position={pos} setPosition={setPos} />
      </MapContainer>

      <div className="mt-2 text-sm">
        Selected:{" "}
        <span className="font-semibold">
          {pos[0].toFixed(6)}, {pos[1].toFixed(6)}
        </span>
      </div>
    </div>
  )
}
