import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { db } from "../../lib/firebase";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import dynamic from "next/dynamic";

const MapTracker = dynamic(() => import("../../components/MapTracker"), {
  ssr: false,
});

export default function OrderTracking() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState(null);
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load Order
  useEffect(() => {
    if (!id) return;

    const ref = doc(db, "orders", id);

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setOrder(data);

          // If a driver has been assigned, load driver details
          if (data.driverId) {
            const dref = doc(db, "drivers", data.driverId);
            const dSnap = await getDoc(dref);
            if (dSnap.exists()) {
              setDriver(dSnap.data());
            }
          }
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  if (!id) return <div className="p-4">No order id provided.</div>;
  if (loading) return <div className="p-4">Loading...</div>;
  if (!order) return <div className="p-4">Order not found.</div>;

  const clientPos = [order.location.lat, order.location.lng];

  const driverPos = order.driverLocation?.coords
    ? [order.driverLocation.coords.lat, order.driverLocation.coords.lng]
    : null;

  const route = order.route || null;

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-3">
        Tracking — {order.trackingCode}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT — ORDER DETAILS */}
        <div>
          <div className="border rounded p-4 bg-white space-y-3">
            <div>
              <strong>Status:</strong> {order.status}
            </div>

            <div>
              <strong>Size:</strong> {order.size}
            </div>

            <div>
              <strong>Tons:</strong> {order.tons}
            </div>

            <div>
              <strong>Payment:</strong> {order.payment}
            </div>

            <div className="mt-3">
              <button
                onClick={() =>
                  window.open(`/user/order?id=${order.id}`, "_blank")
                }
                className="mr-2 border px-3 py-1 rounded"
              >
                Open in new
              </button>
            </div>

            {/* DRIVER INFORMATION */}
            <hr className="my-2" />

            <h3 className="font-semibold text-lg">Driver Information</h3>

            {!driver ? (
              <div className="text-gray-500">
                Driver has not accepted this order yet.
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <strong>Driver Name:</strong> {driver.name}
                </div>

                <div>
                  <strong>Truck Number:</strong> {driver.truckNumber}
                </div>

                <div>
                  <strong>Truck Capacity:</strong> {driver.capacity} tons
                </div>

                {driver.phone && (
                  <div>
                    <strong>Driver Phone:</strong> {driver.phone}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — MAP */}
        <div>
          <div className="border rounded p-3 bg-white">
            <MapTracker
              driverPos={driverPos}
              clientPos={clientPos}
              route={route}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
