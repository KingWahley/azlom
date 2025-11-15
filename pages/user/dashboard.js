import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import dynamic from "next/dynamic";
import { nanoid } from "nanoid";
import OrderCard from "../../components/OrderCard";

const MapPicker = dynamic(() => import("../../components/MapPicker"), {
  ssr: false,
});

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState([9.0765, 7.3986]);
  const [orders, setOrders] = useState([]);

  const [form, setForm] = useState({
    size: "10mm",
    tons: 1,
    payment: "pay_on_delivery",
  });

  // ===========================================================
  // AUTH + LOAD USER ORDERS
  // ===========================================================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setOrders([]);
        return;
      }
      setUser(u);

      const q = query(collection(db, "orders"), where("uid", "==", u.uid));
      const off = onSnapshot(q, (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setOrders(all);
      });

      return () => off();
    });

    return () => unsub();
  }, []);

  // ===========================================================
  // PLACE ORDER
  // ===========================================================
  const placeOrder = async () => {
    if (!user) return alert("Log in first");
    if (!location) return alert("Select delivery location");

    const tracking = nanoid(8).toUpperCase();

    const orderData = {
      uid: user.uid,
      size: form.size,
      tons: Number(form.tons),
      payment: form.payment,
      location: { lat: Number(location[0]), lng: Number(location[1]) },
      status: "pending",
      trackingCode: tracking,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "orders"), orderData);
      alert("Order placed — Tracking: " + tracking);
    } catch (err) {
      console.error(err);
      alert("Error placing order: " + err.message);
    }
  };

  // ===========================================================
  // DELETE ORDER
  // ===========================================================
  const deleteOrder = async (order) => {
    if (!window.confirm("Delete this order?")) return;

    try {
      await deleteDoc(doc(db, "orders", order.id));
    } catch (err) {
      console.error(err);
      alert("Could not delete order.");
    }
  };

  // ===========================================================
  // NAVIGATE TO TRACKING PAGE
  // ===========================================================
  const onTrack = (order) => {
    window.location.href = `/user/order?id=${order.id}`;
  };

  // ===========================================================
  // SPLIT ORDERS
  // ===========================================================
  const ongoing = orders.filter(
    (o) => o.status !== "completed"
  );
  const completed = orders.filter((o) => o.status === "completed");

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">User Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* LEFT — PLACE NEW ORDER */}
        <div>
          <h3 className="font-semibold">Place New Order</h3>

          <label className="block mt-2">Chipping Size</label>
          <select
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            className="border p-2 w-full"
          >
            <option>6mm</option>
            <option>10mm</option>
            <option>20mm</option>
          </select>

          <label className="block mt-2">Tons</label>
          <input
            type="number"
            min={1}
            value={form.tons}
            onChange={(e) => setForm({ ...form, tons: e.target.value })}
            className="border p-2 w-full"
          />

          <label className="block mt-2">Payment</label>
          <select
            value={form.payment}
            onChange={(e) => setForm({ ...form, payment: e.target.value })}
            className="border p-2 w-full"
          >
            <option value="pay_before">Pay before delivery</option>
            <option value="pay_on_delivery">Pay on delivery</option>
          </select>

          <div className="mt-3">
            <MapPicker value={location} onChange={setLocation} />
          </div>

          <button
            onClick={placeOrder}
            className="mt-4 bg-slate-800 text-white px-4 py-2 rounded"
          >
            Place Order
          </button>
        </div>

        {/* RIGHT — USER ORDERS */}
        <div>
          {/* ONGOING */}
          <h3 className="font-semibold">Ongoing Orders</h3>
          <div className="space-y-3 mt-3">
            {ongoing.length === 0 ? (
              <div className="text-gray-500">No ongoing orders</div>
            ) : (
              ongoing.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onTrack={onTrack}
                  onDelete={deleteOrder}
                />
              ))
            )}
          </div>

          {/* COMPLETED */}
          <h3 className="font-semibold mt-6">Completed Orders</h3>
          <div className="space-y-3 mt-3">
            {completed.length === 0 ? (
              <div className="text-gray-500">No completed orders yet</div>
            ) : (
              completed.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onTrack={onTrack}
                  onDelete={deleteOrder}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
