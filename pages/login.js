import { signInWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "../lib/firebase"
import { useRouter } from "next/router"
import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"

export default function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  })

  const router = useRouter()

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      const userCred = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      )
      const uid = userCred.user.uid

      // Check if user is a driver
      const driverDoc = await getDoc(doc(db, "drivers", uid))

      if (driverDoc.exists()) {
        router.push("/driver/dashboard")
      } else {
        router.push("/user/dashboard")
      }
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Login</h2>

      <form onSubmit={onSubmit} className="max-w-md space-y-3">
        <input
          required
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) =>
            setForm({
              ...form,
              email: e.target.value,
            })
          }
          className="border p-2 w-full"
        />

        <input
          required
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) =>
            setForm({
              ...form,
              password: e.target.value,
            })
          }
          className="border p-2 w-full"
        />

        <button className="bg-slate-800 text-white px-4 py-2 rounded">
          Login
        </button>
      </form>
    </div>
  )
}
