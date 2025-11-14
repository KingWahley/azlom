import { generateReceiptPDF } from "./receipt";

export default function OrderCard({ order, onTrack }) {
  const downloadReceipt = async () => {
    try {
      const url = generateReceiptPDF(order);
      // open in new tab
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
      alert("Could not generate receipt.");
    }
  };

  return (
    <div className="border p-3 rounded shadow-sm bg-white">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold text-sm">{order.trackingCode}</div>
          <div className="text-xs text-gray-600">
            {order.size} • {order.tons} tons
          </div>
          <div className="text-xs mt-1">
            Payment: <span className="font-medium">{order.payment}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Status: <span className="font-medium">{order.status}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => onTrack(order)}
            className="bg-slate-800 text-white px-3 py-1 rounded text-xs"
          >
            Track
          </button>
          <button
            onClick={downloadReceipt}
            className="border px-3 py-1 rounded text-xs"
          >
            Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
