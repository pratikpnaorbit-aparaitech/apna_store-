const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

exports.generateInvoice = async ({
  billNo,
  billDate,
  paymentMode,
  customerName,
  items,
  subtotal,
  gst,
  total
}) => {
  // Ensure the bills directory exists
  const dir = path.join(__dirname, "../public/bills");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const filePath = path.join(dir, `${billNo}.pdf`);

  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(fs.createWriteStream(filePath));

  doc.fontSize(18).text("SmartStore", { align: "center" });
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Bill No: ${billNo}`);
  doc.text(`Date: ${billDate}`);
  doc.text(`Customer: ${customerName}`);
  doc.text(`Payment Mode: ${paymentMode}`);
  doc.moveDown();

  doc.fontSize(12).text("Items");
  doc.moveDown(0.5);

  items.forEach((i, idx) => {
    doc.text(
      `${idx + 1}. ${i.name} | Qty: ${i.qty} | MRP: ₹${i.mrp} | ${
        i.discountPercent ? `${i.discountPercent}% OFF` : "No Discount"
      } | ₹${i.total}`
    );
  });

  doc.moveDown();
  doc.text(`Subtotal: ₹${subtotal}`);
  doc.text(`GST (18%): ₹${gst}`);
  doc.fontSize(14).text(`TOTAL: ₹${total}`, { bold: true });

  doc.end();

  // Return public URL – make sure you serve this folder statically in server.js
  // e.g., app.use("/bills", express.static(path.join(__dirname, "public/bills")));
  return `/bills/${billNo}.pdf`;
};