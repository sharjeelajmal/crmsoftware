"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  Save,
  CheckCircle,
  X,
  PlusCircle,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";

// --- Save Confirmation Popup Component (No changes) ---
const SaveConfirmationPopup = ({ invoiceNumber, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-white rounded-2xl shadow-xl w-full max-w-sm text-center p-8 relative"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
      >
        <X size={24} />
      </button>
      <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-gray-800">Saved Successfully!</h3>
      <p className="text-gray-600 mt-2">
        Invoice #__{String(invoiceNumber).padStart(3, "0")}__ has been saved.
      </p>
      <button
        onClick={onClose}
        className="mt-6 w-full py-3 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 transition-transform cursor-pointer"
      >
        OK
      </button>
    </motion.div>
  </motion.div>
);

// --- PDF INVOICE (FINAL UPDATE with Payment Details) ---
const InvoiceForPDF = ({ invoiceData }) => (
  <div
    style={{
      position: "relative",
      width: "820px",
      height: "1160px",
      backgroundColor: "white",
      fontFamily: "sans-serif",
      color: "#111827",
    }}
  >
    <div>
      <header style={{ backgroundColor: "#F6F6F6", padding: "32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: "bold" }}>INVOICE</h1>
            <p style={{ marginTop: "8px", color: "#4B5563" }}>
              Invoice No. {String(invoiceData.invoiceNumber).padStart(3, "0")}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#4B5563" }}>
              {invoiceData.currentDate}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#4B5563" }}>
              {invoiceData.currentTime}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              {invoiceData.logoBase64 && (
                <Image
                  src="/logo.png"
                  alt="Mr. Denum Logo"
                  width={50}
                  height={50}
                />
              )}
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#0D3A25",
                  marginLeft: "12px",
                }}
              >
                Mr. Denum
              </h2>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#4B5563" }}>
              Shop# 02, Noor Plaza Basement, Tire market near
              <br />
              Rasheed center Landa Bazar Lahore
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                marginTop: "4px",
                color: "#4B5563",
              }}
            >
              Rashid Ali: 03214361127
            </p>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#4B5563",
              }}
            >
              Bashir Ahmad: 03217290003
            </p>
          </div>
        </div>
      </header>
      <div style={{ padding: "32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "16px",
          }}
        >
          <div style={{ width: "33.33%" }}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                paddingBottom: "4px",
                marginBottom: "4px",
                textAlign: "right",
              }}
            >
              Customer Details
            </h3>
            <p style={{ textAlign: "right", fontWeight: "500" }}>
              {invoiceData.customerDetails.name}
            </p>
            <p
              style={{
                textAlign: "right",
                fontSize: "0.875rem",
                color: "#4B5563",
              }}
            >
              {invoiceData.customerDetails.phone}
            </p>
          </div>
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "16px",
            fontSize: "0.875rem",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#0D3A25", color: "white" }}>
              <th style={{ textAlign: "left", padding: "8px" }}>Description</th>
              <th style={{ padding: "8px" }}>QTY</th>
              <th style={{ padding: "8px" }}>Price</th>
              <th style={{ padding: "8px" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items
              .filter((i) => i.desc)
              .map((item, index) => {
                const amount =
                  (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
                return (
                  <tr key={index}>
                    <td style={{ border: "1px solid #E5E7EB", padding: "6px" }}>
                      {item.desc}
                    </td>
                    <td
                      style={{
                        border: "1px solid #E5E7EB",
                        padding: "6px",
                        textAlign: "center",
                      }}
                    >
                      {item.qty}
                    </td>
                    <td
                      style={{
                        border: "1px solid #E5E7EB",
                        padding: "6px",
                        textAlign: "center",
                      }}
                    >
                      {item.price}
                    </td>
                    <td
                      style={{
                        border: "1px solid #E5E7EB",
                        padding: "6px",
                        textAlign: "center",
                      }}
                    >
                      {amount.toFixed(0)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <table style={{ width: "250px", fontSize: "0.875rem" }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: "600", paddingRight: "16px" }}>
                  Sub Total:
                </td>
                <td style={{ textAlign: "right" }}>
                  {invoiceData.subTotal.toFixed(0)}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: "600", paddingRight: "16px" }}>
                  Others:
                </td>
                <td style={{ textAlign: "right" }}>{invoiceData.others}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "600", paddingRight: "16px" }}>
                  Discount:
                </td>
                <td style={{ textAlign: "right" }}>{invoiceData.discount}</td>
              </tr>
              <tr style={{ fontWeight: "bold", fontSize: "1.125rem" }}>
                <td style={{ paddingTop: "8px", paddingRight: "16px" }}>
                  Total:
                </td>
                <td style={{ paddingTop: "8px", textAlign: "right" }}>
                  {invoiceData.total.toFixed(0)}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    fontWeight: "600",
                    paddingTop: "8px",
                    paddingRight: "16px",
                  }}
                >
                  Received:
                </td>
                <td style={{ textAlign: "right", paddingTop: "8px" }}>
                  {invoiceData.receivedAmount}
                </td>
              </tr>
              <tr
                style={{
                  fontWeight: "bold",
                  fontSize: "1.25rem",
                  color: "red",
                }}
              >
                <td style={{ paddingTop: "8px", paddingRight: "16px" }}>
                  Balance:
                </td>
                <td style={{ paddingTop: "8px", textAlign: "right" }}>
                  {invoiceData.balance.toFixed(0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <footer
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        backgroundColor: "#F6F6F6",
        padding: "32px",
      }}
    >
      <div style={{ borderTop: "2px solid black", paddingTop: "24px" }}>
        {/* --- PAYMENT DETAILS SECTION (WAPAS ADD KIYA GAYA HAI) --- */}
        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "bold",
              textAlign: "left",
              marginBottom: "12px",
            }}
          >
            Payment Details
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
              fontSize: "0.75rem",
            }}
          >
            <div>
              <p>
                <span style={{ fontWeight: "600" }}>Bank Name:</span> Meezan
                Bank
              </p>
              <p>
                <span style={{ fontWeight: "600" }}>Account Name:</span>{" "}
                Muhammad Waqar
              </p>
              <p>
                <span style={{ fontWeight: "600" }}>Account Number:</span>{" "}
                02760102977856
              </p>
            </div>
            <div>
              <p>
                <span style={{ fontWeight: "600" }}>Bank Name:</span> Faisal
                Bank
              </p>
              <p>
                <span style={{ fontWeight: "600" }}>Account Name:</span>{" "}
                Muhammad Waqar
              </p>
              <p>
                <span style={{ fontWeight: "600" }}>Account Number:</span>{" "}
                3241301000004794
              </p>
            </div>
            <div>
              <p>
                <span style={{ fontWeight: "600" }}>Bank Name:</span> UBL Bank
              </p>
              <p>
                <span style={{ fontWeight: "600" }}>Account Name:</span>{" "}
                Muhammad Waqar
              </p>
              <p>
                <span style={{ fontWeight: "600" }}>Account Number:</span>{" "}
                1569328218288
              </p>
            </div>
            <div>
              <p>
                <span style={{ fontWeight: "600" }}>Bank Name:</span> MCB Bank
              </p>
              <p>
                <span style={{ fontWeight: "600" }}>Account Name:</span> Bashir
                Ahmad
              </p>
              <p>
                <span style={{ fontWeight: "600" }}>Account Number:</span>{" "}
                0000000006375057
              </p>
            </div>
          </div>
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: "1rem",
            color: "white",
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: "#0D3A25",
            fontFamily: "var(--font-noto-nastaliq-urdu)",
          }}
        >
          براہ کرم اپنی سامان موقع پر تسلی سے گن کر لیں۔ بعد میں ہم ذمہ دار نہ
          ہوں گے۔
        </div>
      </div>
    </footer>
  </div>
);

export default function NewInvoicePage() {
  const [invoiceNumber, setInvoiceNumber] = useState(1);
  const [customerDetails, setCustomerDetails] = useState({
    name: "",
    phone: "",
  });
  const [items, setItems] = useState([
    { desc: "", qty: "", price: "" },
    { desc: "", qty: "", price: "" },
    { desc: "", qty: "", price: "" },
    { desc: "", qty: "", price: "" },
  ]);
  const [others, setOthers] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [balance, setBalance] = useState(0);
  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSavePopup, setShowSavePopup] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setAllProducts(data);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };
    fetchProducts();
    const fetchLatestInvoice = async () => {
      try {
        const res = await fetch("/api/sales/latest");
        if (res.ok) {
          const data = await res.json();
          setInvoiceNumber(data.latestInvoiceNumber + 1);
        }
      } catch (error) {
        console.error("Failed to fetch latest invoice number:", error);
      }
    };
    fetchLatestInvoice();
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString());
      setCurrentTime(now.toLocaleTimeString());
    }, 1000);

    const newSubTotal = items.reduce(
      (acc, item) =>
        acc + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0),
      0
    );
    setSubTotal(newSubTotal);
    const newTotal =
      newSubTotal + (parseFloat(others) || 0) - (parseFloat(discount) || 0);
    setTotal(newTotal);
    const newBalance = newTotal - (parseFloat(receivedAmount) || 0);
    setBalance(newBalance);

    return () => clearInterval(timer);
  }, [items, others, discount, receivedAmount]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === "desc") {
      if (value) {
        const filteredSuggestions = allProducts.filter((p) =>
          p.name.toLowerCase().includes(value.toLowerCase())
        );
        setSuggestions(filteredSuggestions);
        setActiveSuggestionIndex(index);
      } else {
        setSuggestions([]);
        setActiveSuggestionIndex(-1);
      }
    }
    if (field === "desc" && value === "") {
      newItems[index]["qty"] = "";
      newItems[index]["price"] = "";
    }
    setItems(newItems);
  };
  const handleSuggestionClick = (itemIndex, product) => {
    const newItems = [...items];
    newItems[itemIndex].desc = product.name;
    newItems[itemIndex].price = product.salePrice;
    setItems(newItems);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    document.getElementsByName(`qty-${itemIndex}`)[0].focus();
  };
  const handleCustomerChange = (field, value) => {
    setCustomerDetails((prev) => ({ ...prev, [field]: value }));
  };
  const handlePrint = () => {
    window.print();
  };
  const addRow = () => {
    setItems([...items, { desc: "", qty: "", price: "" }]);
  };

  const handleSave = async () => {
    const invoiceDataForDB = {
      invoiceNumber,
      customerName: customerDetails.name,
      customerPhone: customerDetails.phone,
      items: items.filter((item) => item.desc && item.qty && item.price),
      total,
      others: parseFloat(others),
      discount: parseFloat(discount),
      subTotal,
      receivedAmount: parseFloat(receivedAmount),
      balance,
      invoiceDate: new Date(),
    };
    const response = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceDataForDB),
    });
    if (response.ok) {
      setShowSavePopup(true);
    } else {
      alert("Failed to save the sale to database.");
      return;
    }
    const logoRes = await fetch("/logo.png");
    const logoBlob = await logoRes.blob();
    const reader = new FileReader();
    reader.readAsDataURL(logoBlob);
    reader.onloadend = () => {
      const logoBase64 = reader.result;
      const invoiceDataForPDF = {
        ...invoiceDataForDB,
        currentDate,
        currentTime,
        customerDetails,
        items,
        logoBase64,
      };
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      document.body.appendChild(tempContainer);
      const root = createRoot(tempContainer);
      root.render(<InvoiceForPDF invoiceData={invoiceDataForPDF} />);
      setTimeout(() => {
        html2canvas(tempContainer.firstChild, { scale: 3, useCORS: true }).then(
          (canvas) => {
            const pdf = new jsPDF("p", "mm", "a4");
            const imgData = canvas.toDataURL("image/png");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`invoice-${invoiceNumber}.pdf`);
            document.body.removeChild(tempContainer);
          }
        );
      }, 500);
    };
  };

  const closePopupAndReset = () => {
    setShowSavePopup(false);
    setCustomerDetails({ name: "", phone: "" });
    setItems([
      { desc: "", qty: "", price: "" },
      { desc: "", qty: "", price: "" },
      { desc: "", qty: "", price: "" },
      { desc: "", qty: "", price: "" },
    ]);
    setOthers(0);
    setDiscount(0);
    setReceivedAmount(0);
    setInvoiceNumber((prev) => prev + 1);
  };

  return (
    <>
      <AnimatePresence>
        {showSavePopup && (
          <SaveConfirmationPopup
            invoiceNumber={invoiceNumber}
            onClose={closePopupAndReset}
          />
        )}
      </AnimatePresence>
      <div
        id="invoice-section"
        className="bg-white max-w-4xl mx-auto font-sans"
      >
        <header className="p-8" style={{ backgroundColor: "#F6F6F6" }}>
          <div className="flex justify-between items-start">
            {" "}
            <div>
              {" "}
              <h1 className="text-4xl font-bold tracking-wider">
                INVOICE
              </h1>{" "}
              <p className="font-medium mt-2 text-sm">
                Invoice No. {String(invoiceNumber).padStart(3, "0")}
              </p>{" "}
              <p className="text-xs font-medium">{currentDate}</p>{" "}
              <p className="text-xs font-medium">{currentTime}</p>{" "}
            </div>{" "}
            <div className="text-right">
              {" "}
              <div className="flex justify-end items-center">
                <Image
                  src="/logo.png"
                  alt="Mr. Denum Logo"
                  width={50}
                  height={50}
                />
                <h2
                  className="text-2xl font-bold ml-3"
                  style={{ color: "#0D3A25" }}
                >
                  Mr. Denum
                </h2>
              </div>{" "}
              <p className="text-xs mt-2">
                Shop# 02, Noor Plaza Basement, Tire market near
                <br />
                Rasheed center Landa Bazar Lahore
              </p>{" "}
              <p className="text-xs font-semibold mt-1">
                Rashid Ali: 03214361127
              </p>{" "}
              <p className="text-xs font-semibold">Bashir Ahmad: 03217290003</p>{" "}
            </div>{" "}
          </div>
        </header>
        <div className="p-8">
          <div className="w-full flex justify-end mb-4">
            <div className="w-1/3">
              <h3 className="text-md font-semibold pb-1 mb-1 text-right">
                Customer Details
              </h3>
              <input
                type="text"
                placeholder="Enter Name"
                value={customerDetails.name}
                onChange={(e) => handleCustomerChange("name", e.target.value)}
                className="text-sm font-medium w-full p-1 text-right outline-none bg-transparent placeholder:text-gray-400"
              />
              <input
                type="text"
                placeholder="Enter Phone"
                value={customerDetails.phone}
                onChange={(e) => handleCustomerChange("phone", e.target.value)}
                className="text-xs w-full p-1 text-right outline-none bg-transparent placeholder:text-gray-400"
              />
            </div>
          </div>
          <table className="w-full mb-2 border-collapse">
            {" "}
            <thead>
              <tr style={{ backgroundColor: "#0D3A25" }}>
                <th className="text-left font-semibold p-2 text-sm w-1/2 text-white">
                  Description
                </th>
                <th className="font-semibold p-2 text-sm text-white">QTY</th>
                <th className="font-semibold p-2 text-sm text-white">Price</th>
                <th className="font-semibold p-2 text-sm text-white">Amount</th>
              </tr>
            </thead>{" "}
            <tbody>
              {items.map((item, index) => {
                const amount =
                  (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
                return (
                  <tr
                    key={index}
                    className="border text-sm"
                    style={{ borderColor: "#E5E7EB" }}
                  >
                    {" "}
                    <td
                      className="border relative"
                      style={{ borderColor: "#E5E7EB" }}
                    >
                      {" "}
                      <input
                        type="text"
                        value={item.desc}
                        onChange={(e) =>
                          handleItemChange(index, "desc", e.target.value)
                        }
                        className="w-full p-1.5 outline-none text-sm bg-transparent"
                      />{" "}
                      {activeSuggestionIndex === index &&
                        suggestions.length > 0 && (
                          <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                            {" "}
                            {suggestions.map((p) => (
                              <div
                                key={p._id}
                                onClick={() => handleSuggestionClick(index, p)}
                                className="p-2 cursor-pointer hover:bg-gray-100 text-gray-800"
                              >
                                {" "}
                                {p.name}{" "}
                              </div>
                            ))}{" "}
                          </div>
                        )}{" "}
                    </td>{" "}
                    <td className="border" style={{ borderColor: "#E5E7EB" }}>
                      <input
                        type="number"
                        name={`qty-${index}`}
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(index, "qty", e.target.value)
                        }
                        className="w-full p-1.5 text-center outline-none text-sm bg-transparent"
                      />
                    </td>{" "}
                    <td className="border" style={{ borderColor: "#E5E7EB" }}>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(index, "price", e.target.value)
                        }
                        className="w-full p-1.5 text-center outline-none text-sm bg-transparent"
                      />
                    </td>{" "}
                    <td
                      className="p-1.5 text-center border"
                      style={{ borderColor: "#E5E7EB" }}
                    >
                      {amount > 0 ? amount.toFixed(0) : ""}
                    </td>{" "}
                  </tr>
                );
              })}
            </tbody>{" "}
          </table>
          <div className="flex justify-start mt-2 mb-4">
            <button
              onClick={addRow}
              className="flex items-center gap-2 text-sm font-semibold text-[#0D3A25] hover:opacity-80 transition-opacity"
            >
              <PlusCircle size={18} /> Add New Row
            </button>
          </div>

          <div className="flex justify-end mb-4">
            <table className="w-64 text-sm">
              <tbody>
                <tr>
                  <td className="font-semibold pr-4">Sub Total:</td>
                  <td className="text-right">{subTotal.toFixed(0)}</td>
                </tr>
                <tr>
                  <td className="font-semibold pr-4">Others:</td>
                  <td>
                    <input
                      type="number"
                      value={others}
                      onChange={(e) => setOthers(e.target.value)}
                      className="w-full text-right outline-none text-sm bg-transparent"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold pr-4">Discount:</td>
                  <td>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full text-right outline-none text-sm bg-transparent"
                    />
                  </td>
                </tr>
                <tr className="font-bold text-md">
                  <td className="pt-2 pr-4">Total:</td>
                  <td className="pt-2 text-right">{total.toFixed(0)}</td>
                </tr>
                <tr>
                  <td className="font-semibold pr-4 pt-2">Received:</td>
                  <td>
                    <input
                      type="number"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="w-full text-right outline-none text-sm bg-transparent pt-2"
                    />
                  </td>
                </tr>
                <tr className="font-bold text-xl text-red-600">
                  <td className="pt-2 pr-4">Balance:</td>
                  <td className="pt-2 text-right">{balance.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <footer style={{ backgroundColor: "#F6F6F6" }}>
          <div className="p-8">
            {" "}
            <div>
              {" "}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-left mb-3">
                  Payment Details
                </h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                  <div>
                    <p>
                      <span className="font-semibold">Bank Name:</span> Meezan
                      Bank
                    </p>
                    <p>
                      <span className="font-semibold">Account Name:</span>{" "}
                      Muhammad Waqar
                    </p>
                    <p>
                      <span className="font-semibold">Account Number:</span>{" "}
                      02760102977856
                    </p>
                  </div>
                  <div>
                    <p>
                      <span className="font-semibold">Bank Name:</span> Faisal
                      Bank
                    </p>
                    <p>
                      <span className="font-semibold">Account Name:</span>{" "}
                      Muhammad Waqar
                    </p>
                    <p>
                      <span className="font-semibold">Account Number:</span>{" "}
                      3241301000004794
                    </p>
                  </div>
                  <div>
                    <p>
                      <span className="font-semibold">Bank Name:</span> UBL Bank
                    </p>
                    <p>
                      <span className="font-semibold">Account Name:</span>{" "}
                      Muhammad Waqar
                    </p>
                    <p>
                      <span className="font-semibold">Account Number:</span>{" "}
                      1569328218288
                    </p>
                  </div>
                  <div>
                    <p>
                      <span className="font-semibold">Bank Name:</span> MCB Bank
                    </p>
                    <p>
                      <span className="font-semibold">Account Name:</span>{" "}
                  Bashir Ahmad
                    </p>
                    <p>
                      <span className="font-semibold">Account Number:</span>{" "}
                      0000000006375057
                    </p>
                  </div>
                </div>
              </div>{" "}
              <div
                className="text-center text-md text-white p-2 rounded-lg mb-6"
                style={{
                  backgroundColor: "#0D3A25",
                  fontFamily: "var(--font-noto-nastaliq-urdu)",
                }}
              >
                براہ کرم اپنی سامان موقع پر تسلی سے گن کر لیں۔ بعد میں ہم ذمہ
                دار نہ ہوں گے۔
              </div>{" "}
              <div
                id="action-buttons"
                className="flex justify-between items-center no-print"
              >
                {" "}
                <Link
                  href="/sales"
                  className="flex items-center font-semibold text-sm"
                  style={{ color: "#4B5563" }}
                >
                  <ArrowLeft size={16} className="mr-2" /> Back to Sales
                </Link>{" "}
                <div className="flex gap-4">
                  {" "}
                  <button
                    onClick={handleSave}
                    className="flex items-center text-white font-semibold py-2 px-5 rounded-lg transition-opacity hover:opacity-90 text-sm"
                    style={{ backgroundColor: "#0D3A25" }}
                  >
                    <Save size={16} className="mr-2" /> Save
                  </button>{" "}
                  <button
                    onClick={handlePrint}
                    className="flex items-center text-white font-semibold py-2 px-5 rounded-lg transition-opacity hover:opacity-90 text-sm"
                    style={{ backgroundColor: "#0D3A25" }}
                  >
                    <Printer size={16} className="mr-2" /> Print
                  </button>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        </footer>
      </div>
    </>
  );
}
