import Link from "next/link";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/router";

export default function Layout({ children }) {
  const router = useRouter();

  const logout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto p-4 flex justify-between items-center">
          <h1 className="font-semibold">Azlom Chippings</h1>

          {/* NAVIGATION */}
          <nav className="space-x-4 text-sm flex items-center">
            <Link href="/">Home</Link>
            <Link href="/auth/register-driver">Register Driver</Link>
            <Link href="/auth/register-user">Register Client</Link>
            <Link href="/login">Login</Link>

            {/* LOGOUT BUTTON */}
            <button
              onClick={logout}
              className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}
