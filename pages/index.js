import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">
        Order chippings — fast direct from quarry
      </h2>
      <p className="mb-4">Place order and track in real-time on map.</p>

      <div className="space-x-2">
        <Link
          href="/register"
          className="bg-slate-800 text-white px-4 py-2 rounded"
        >
          Register
        </Link>

        <Link href="/login" className="border px-4 py-2 rounded">
          Login
        </Link>
      </div>
    </div>
  );
}
