// client-side helper to create a PDF receipt using jsPDF
import jsPDF from "jspdf";

export function generateReceiptPDF(order) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(18);
  doc.text("Azlom Chippings — Receipt", 40, 50);

  doc.setFontSize(12);
  const yStart = 90;
  const gap = 20;
  doc.text(`Tracking Code: ${order.trackingCode || ""}`, 40, yStart);
  doc.text(`Status: ${order.status || ""}`, 40, yStart + gap);
  doc.text(`Size: ${order.size || ""}`, 40, yStart + gap * 2);
  doc.text(`Tons: ${order.tons || ""}`, 40, yStart + gap * 3);
  doc.text(`Payment: ${order.payment || ""}`, 40, yStart + gap * 4);
  if (order.location) {
    doc.text(`Delivery Location: ${order.location.lat.toFixed(6)}, ${order.location.lng.toFixed(6)}`, 40, yStart + gap * 5);
  }
  const created = order.createdAt ? (order.createdAt.seconds ? new Date(order.createdAt.seconds * 1000) : new Date(order.createdAt)) : null;
  doc.text(`Placed: ${created ? created.toLocaleString() : "—"}`, 40, yStart + gap * 6);

  doc.setFontSize(10);
  doc.text("Thank you for ordering from Azlom Chippings.", 40, yStart + gap * 9);

  return doc.output("bloburl"); // returns a URL you can open/download
}
