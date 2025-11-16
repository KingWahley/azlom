// INITIAL REGISTRATION PAGE BEFORE I SPLIT THEM INTO DRIVER PAGE AND CLIENT

import { useState } from "react";
import { auth, db } from "../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/router";

export default function Register() {
  const [isDriver, setIsDriver] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    truckNumber: "",
    capacity: "",
  });

  const router = useRouter();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const uid = userCred.user.uid;

      if (isDriver) {
        await setDoc(doc(db, "drivers", uid), {
          name: form.name,
          phone: form.phone,
          truckNumber: form.truckNumber,
          capacity: Number(form.capacity),
          uid,
        });
        router.push("/driver/dashboard");
      } else {
        await setDoc(doc(db, "users", uid), {
          name: form.name,
          phone: form.phone,
          uid,
        });
        router.push("/user/dashboard");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Register</h2>

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={isDriver}
          onChange={() => setIsDriver((s) => !s)}
        />
        Register as Driver
      </label>

      <form onSubmit={onSubmit} className="space-y-3 max-w-md">
        <input
          required
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border p-2 w-full"
        />

        <input
          required
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="border p-2 w-full"
        />

        <input
          required
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="border p-2 w-full"
        />

        <input
          required
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="border p-2 w-full"
        />

        {isDriver && (
          <>
            <input
              placeholder="Truck Number"
              value={form.truckNumber}
              onChange={(e) =>
                setForm({ ...form, truckNumber: e.target.value })
              }
              className="border p-2 w-full"
            />

            <input
              placeholder="Truck Capacity (tons)"
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="border p-2 w-full"
            />
          </>
        )}

        <button className="bg-slate-800 text-white px-4 py-2 rounded">
          Register
        </button>
      </form>
    </div>
  );
}
