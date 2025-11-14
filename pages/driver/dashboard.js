import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import dynamic from "next/dynamic";

const MapTracker = dynamic(() => import("../../components/MapTracker"), {
  ssr: false,
});

export default function DriverDashboard() {
  const [driver, setDriver] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [driverPos, setDriverPos] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // ============================
  // LOAD DRIVER + ACTIVE JOB + COMPLETED JOBS
  // ============================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      // Load driver profile
      const dref = doc(db, "drivers", u.uid);
      const snap = await getDoc(dref);
      if (snap.exists()) {
        setDriver({ ...snap.data(), uid: u.uid });
      }

      // Persistent ACTIVE job
      const activeQ = query(
        collection(db, "orders"),
        where("driverId", "==", u.uid)
      );

      onSnapshot(activeQ, (docs) => {
        if (!docs.empty) {
          const found = docs.docs[0];
          const job = { id: found.id, ...found.data() };
          setCurrentOrder(job);
          loadCustomer(job);
        } else {
          setCurrentOrder(null);
        }
      });

      // Real-time list of completed jobs
      const completedQ = query(
        collection(db, "completed_jobs"),
        where("driverId", "==", u.uid)
      );

      onSnapshot(completedQ, (docs) => {
        const items = docs.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCompletedOrders(items);
      });

      // Load pending orders
      const q = query(
        collection(db, "orders"),
        where("status", "==", "pending")
      );
      onSnapshot(q, (docs) => {
        const all = docs.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (snap.exists()) {
          const cap = snap.data().capacity;
          setAvailableOrders(all.filter((o) => o.tons <= cap));
        } else {
          setAvailableOrders(all);
        }
      });
    });

    return () => unsub();
  }, []);

  // ============================
  // LOAD CUSTOMER INFO
  // ============================
  const loadCustomer = async (order) => {
    if (!order) return;

    const userId = order.userId || order.owner || order.customerId;
    if (!userId) return;

    try {
      const uref = doc(db, "users", userId);
      const snap = await getDoc(uref);
      if (snap.exists()) setCustomer(snap.data());
    } catch (err) {
      console.error("Customer load error:", err);
    }
  };

  // ============================
  // ACCEPT ORDER
  // ============================
  const accept = async (order) => {
    if (!driver) return alert("Driver profile not loaded yet.");

    await updateDoc(doc(db, "orders", order.id), {
      status: "assigned",
      driverId: driver.uid,
      driverName: driver.name,
    });

    setCurrentOrder(order);
    loadCustomer(order);
  };

  // ============================
  // LOG COMPLETED JOB
  // ============================
  const logCompletedJob = async (order) => {
    try {
      const ref = doc(collection(db, "completed_jobs"));
      await setDoc(ref, {
        ...order,
        completedAt: new Date(),
        driverId: driver.uid,
        driverName: driver.name,
      });
    } catch (err) {
      console.error("Logging error:", err);
    }
  };

  // ============================
  // START DELIVERY
  // ============================
  const startDelivery = async () => {
    if (!currentOrder) return;

    setLoadingRoute(true);

    await updateDoc(doc(db, "orders", currentOrder.id), {
      status: "on_route",
    });

    navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setDriverPos([coords.lat, coords.lng]);

        await updateDoc(doc(db, "orders", currentOrder.id), {
          driverLocation: { coords, updatedAt: new Date() },
        });

        const startStr = `${coords.lng},${coords.lat}`;
        const endStr = `${currentOrder.location.lng},${currentOrder.location.lat}`;

        const url = `https://router.project-osrm.org/route/v1/driving/${startStr};${endStr}?overview=full&geometries=geojson`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.routes?.length) {
          const route = data.routes[0].geometry.coordinates.map((c) => ({
            lat: c[1],
            lng: c[0],
          }));

          await updateDoc(doc(db, "orders", currentOrder.id), { route });
          setCurrentOrder((prev) => ({ ...prev, route }));
        }

        setLoadingRoute(false);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true }
    );
  };

  // ============================
  // UPDATE STATUS
  // ============================
  const markStatus = async (status) => {
    if (!currentOrder) return;

    if (status === "delivered") {
      const confirmClose = window.confirm(
        "Are you sure you want to mark this job as delivered?"
      );
      if (!confirmClose) return;

      // Save to completed_jobs
      await logCompletedJob(currentOrder);

      // Update main order
      await updateDoc(doc(db, "orders", currentOrder.id), {
        status: "completed",
        completedAt: new Date(),
        driverId: null,
      });

      setSuccessMessage("Job Completed Successfully!");
      setTimeout(() => setSuccessMessage(null), 4000);

      setCurrentOrder(null);
      setCustomer(null);

      return;
    }

    // normal status update
    await updateDoc(doc(db, "orders", currentOrder.id), { status });
    setCurrentOrder((prev) => ({ ...prev, status }));
  };

  // ============================
  // UI
  // ============================
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Driver Dashboard</h2>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT — Available Orders */}
        <div>
          <h3 className="font-semibold">Available Orders</h3>

          <div className="space-y-2 mt-3">
            {availableOrders.length === 0 && (
              <div className="text-gray-500">No available orders</div>
            )}

            {availableOrders.map((o) => (
              <div
                key={o.id}
                className="border p-3 rounded flex justify-between"
              >
                <div>
                  <div className="font-semibold">{o.trackingCode}</div>
                  <div>{o.tons} tons</div>
                </div>

                <button
                  onClick={() => accept(o)}
                  className="px-3 py-1 rounded bg-slate-800 text-white"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>

          {/* COMPLETED JOBS */}
          <h3 className="font-semibold mt-6">Completed Jobs</h3>
          <div className="mt-3 space-y-2">
            {completedOrders.length === 0 ? (
              <div className="text-gray-500">No completed jobs yet</div>
            ) : (
              completedOrders.map((job) => (
                <div key={job.id} className="border p-3 rounded bg-green-50">
                  <div className="font-semibold">{job.trackingCode}</div>
                  <div>{job.tons} tons</div>
                  <div className="text-sm text-gray-600">
                    Delivered:{" "}
                    {new Date(job.completedAt.toDate()).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT — Current Job */}
        <div>
          <h3 className="font-semibold">Current Job</h3>

          {!currentOrder ? (
            <div className="text-gray-500 mt-3">No active job</div>
          ) : (
            <div className="mt-3">
              <div className="font-semibold">{currentOrder.trackingCode}</div>
              <div className="text-sm mb-4">Status: {currentOrder.status}</div>

              {/* CUSTOMER */}
              <div className="border rounded p-3 bg-gray-50 mb-4">
                <h4 className="font-semibold mb-2">Customer Details</h4>

                {!customer ? (
                  <div className="text-gray-500">Loading customer...</div>
                ) : (
                  <>
                    <div>
                      <strong>Name:</strong> {customer.fullName}
                    </div>
                    <div>
                      <strong>Phone:</strong> {customer.phone}
                    </div>
                  </>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={startDelivery}
                  className="bg-blue-600 text-white px-3 py-1 rounded"
                >
                  Start Delivery
                </button>

                <button
                  onClick={() => markStatus("loading_in_quarry")}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Loading in Quarry
                </button>

                <button
                  onClick={() => markStatus("on_route")}
                  className="bg-orange-500 text-white px-3 py-1 rounded"
                >
                  On Route
                </button>

                <button
                  onClick={() => markStatus("delivered")}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Delivered
                </button>
              </div>

              {loadingRoute && (
                <div className="p-3 bg-yellow-100 border rounded text-yellow-800 mb-3">
                  Calculating route, please wait…
                </div>
              )}

              <MapTracker
                driverPos={driverPos}
                clientPos={[
                  currentOrder.location.lat,
                  currentOrder.location.lng,
                ]}
                route={currentOrder.route}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
