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

  const [activeStatus, setActiveStatus] = useState(null);

  // ============= LOAD DRIVER + JOBS =============
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      const dref = doc(db, "drivers", u.uid);
      const snap = await getDoc(dref);
      if (snap.exists()) setDriver({ ...snap.data(), uid: u.uid });

      const activeQ = query(
        collection(db, "orders"),
        where("driverId", "==", u.uid)
      );

      onSnapshot(activeQ, (docs) => {
        if (!docs.empty) {
          const job = { id: docs.docs[0].id, ...docs.docs[0].data() };
          setCurrentOrder(job);
          setActiveStatus(job.status);
          loadCustomer(job);
        } else {
          setCurrentOrder(null);
        }
      });

      const completedQ = query(
        collection(db, "completed_jobs"),
        where("driverId", "==", u.uid)
      );

      onSnapshot(completedQ, (docs) => {
        setCompletedOrders(docs.docs.map((d) => ({ id: d.id, ...d.data() })));
      });

      const pendingQ = query(
        collection(db, "orders"),
        where("status", "==", "pending")
      );

      onSnapshot(pendingQ, (docs) => {
        const orders = docs.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (snap.exists()) {
          const cap = snap.data().capacity;
          setAvailableOrders(orders.filter((o) => o.tons <= cap));
        } else {
          setAvailableOrders(orders);
        }
      });
    });

    return () => unsub();
  }, []);

  // ============= LOAD CUSTOMER INFO =============
  const loadCustomer = async (order) => {
    if (!order) return;

    const userId = order.userId || order.owner || order.customerId;
    if (!userId) return;

    const snap = await getDoc(doc(db, "users", userId));
    if (snap.exists()) setCustomer(snap.data());
  };

  // ============= ACCEPT ORDER =============
  const accept = async (order) => {
    await updateDoc(doc(db, "orders", order.id), {
      status: "assigned",
      driverId: driver.uid,
      driverName: driver.name,
    });

    setCurrentOrder(order);
    setActiveStatus("assigned");
    loadCustomer(order);
  };

  // ============= LOG COMPLETED JOB =============
  const logCompletedJob = async (order) => {
    await setDoc(doc(collection(db, "completed_jobs")), {
      ...order,
      completedAt: new Date(),
      driverId: driver.uid,
      driverName: driver.name,
    });
  };

  // ============= START DELIVERY =============
  const startDelivery = async () => {
    if (!currentOrder) return;

    setLoadingRoute(true);

    await updateDoc(doc(db, "orders", currentOrder.id), {
      status: "on_route",
    });

    setActiveStatus("on_route");

    navigator.geolocation.watchPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        // jump to driver immediately
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

  // ============= UPDATE STATUS =============
  const markStatus = async (status) => {
    if (!currentOrder) return;

    setActiveStatus(status);

    if (status === "delivered") {
      if (!window.confirm("Confirm delivery?")) return;

      await logCompletedJob(currentOrder);

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

    await updateDoc(doc(db, "orders", currentOrder.id), { status });
    setCurrentOrder((prev) => ({ ...prev, status }));
  };

  // ============= BUTTON STYLE FOR ACTIVE =============
  const btn = (state) =>
    `px-3 py-1 rounded text-white ${
      activeStatus === state
        ? "ring-2 ring-blue-400 scale-105 shadow bg-gray-900"
        : ""
    }`;

  // ============= UI =============
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Driver Dashboard</h2>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT ===================== */}
        <div>
          <h3 className="font-semibold">Available Orders</h3>

          <div className="space-y-2 mt-3">
            {availableOrders.length === 0 ? (
              <div className="text-gray-500">No available orders</div>
            ) : (
              availableOrders.map((o) => (
                <div key={o.id} className="border p-3 rounded flex justify-between">
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
              ))
            )}
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

        {/* RIGHT ===================== */}
        <div>
          <h3 className="font-semibold">Current Job</h3>

          {!currentOrder ? (
            <div className="text-gray-500 mt-3">No active job</div>
          ) : (
            <div className="mt-3">
              <div className="font-semibold text-lg">
                {currentOrder.trackingCode}
              </div>

              <div className="text-sm text-gray-600 mb-3">
                <strong>Delivery Address:</strong> {currentOrder.location?.address}
              </div>

              <div className="text-sm mb-4">
                <strong>Status:</strong> {currentOrder.status}
              </div>

              {/* CUSTOMER INFO */}
              <div className="border rounded p-3 bg-gray-50 mb-4">
                <h4 className="font-semibold mb-2">Customer Details</h4>

                {!customer ? (
                  <div className="text-gray-500">Loading customer...</div>
                ) : (
                  <>
                    <div><strong>Name:</strong> {customer.fullName}</div>
                    <div><strong>Phone:</strong> {customer.phone}</div>
                  </>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={startDelivery}
                  className={`${btn("on_route")} bg-blue-600`}
                >
                  Start Delivery
                </button>

                <button
                  onClick={() => markStatus("loading_in_quarry")}
                  className={`${btn("loading_in_quarry")} bg-yellow-500`}
                >
                  Loading in Quarry
                </button>

                <button
                  onClick={() => markStatus("on_route")}
                  className={`${btn("on_route")} bg-orange-500`}
                >
                  On Route
                </button>

                <button
                  onClick={() => markStatus("delivered")}
                  className={`${btn("delivered")} bg-green-600`}
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
