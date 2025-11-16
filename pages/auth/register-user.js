// pages/auth/register-user.js
import { useState } from "react";
import { auth, db } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/router";

export default function RegisterUser() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const uid = userCred.user.uid;

      await setDoc(doc(db, "users", uid), {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        uid,
        userType: "user",
        createdAt: new Date(),
      });

      alert("Account created!");
      router.push("/user/dashboard");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-md p-4">
      <h2 className="text-xl font-semibold mb-3">User Registration</h2>

      <form onSubmit={submit} className="space-y-3">
        <input
          required
          placeholder="Full Name"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
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
          type="email"
          placeholder="Email"
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

        <button className="bg-slate-800 text-white px-4 py-2 rounded w-full">
          Register as User
        </button>
      </form>
    </div>
  );
}
