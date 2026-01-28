"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Search,
  DollarSign,
  BarChart,
  Users,
  Trash2,
  X,
  AlertTriangle,
  Phone,
  Badge,
  Calendar,
  MoreHorizontal,
  Eye,
  FileText,
  Save,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import Loader from "@/components/Loader";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import Image from "next/image";

// --- Reusable Components ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } },
};
const Modal = ({ children, onCancel, size = "md" }) => {
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-4xl",
  };
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    >
      {" "}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-white rounded-2xl shadow-xl w-full ${sizeClasses[size]} relative flex flex-col`}
      >
        {" "}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-20 cursor-pointer"
        >
          <X size={24} />
        </button>{" "}
        <div className="p-1 sm:p-2 overflow-y-auto max-h-[90vh]">
          {children}
        </div>{" "}
      </motion.div>{" "}
    </motion.div>
  );
};
const ConfirmationPopup = ({ message, onConfirm, onCancel }) => (
  <Modal onCancel={onCancel} size="sm">
    {" "}
    <div className="p-6 text-center">
      {" "}
      <AlertTriangle className="mx-auto text-yellow-500" size={48} />{" "}
      <h3 className="text-xl font-bold mt-4 mb-2 text-gray-800">
        Are you sure?
      </h3>{" "}
      <p className="my-4 text-md text-gray-600">{message}</p>{" "}
      <div className="flex justify-center gap-4 mt-6">
        {" "}
        <button
          onClick={onCancel}
          className="py-2 px-6 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
        >
          Cancel
        </button>{" "}
        <button
          onClick={onConfirm}
          className="py-2 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
        >
          Confirm Delete
        </button>{" "}
      </div>{" "}
    </div>{" "}
  </Modal>
);
const StatCard = ({ icon: Icon, title, value }) => (
  <motion.div
    variants={itemVariants}
    className="flex items-center p-5 rounded-2xl text-white relative overflow-hidden"
    style={{ backgroundColor: "#0D3A25" }}
  >
    {" "}
    <div className="absolute -bottom-1 -right-1 w-24 h-24 bg-white/5 rounded-full"></div>{" "}
    <div className="p-3 bg-white/20 rounded-full mr-4">
      <Icon size={24} />
    </div>{" "}
    <div>
      {" "}
      <h3 className="text-md font-light">{title}</h3>{" "}
      <p className="text-2xl lg:text-3xl font-bold">{value}</p>{" "}
    </div>{" "}
  </motion.div>
);
const NotificationPopup = ({ message, type, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className="fixed bottom-5 right-5 bg-white p-4 rounded-xl shadow-lg flex items-center gap-4 z-[9999]"
  >
    {" "}
    {type === "success" ? (
      <CheckCircle className="text-green-500" size={24} />
    ) : (
      <AlertTriangle className="text-red-500" size={24} />
    )}{" "}
    <p className="font-semibold text-gray-800">{message}</p>{" "}
    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
      <X size={18} />
    </button>{" "}
  </motion.div>
);

// --- Popups ---
const AddSalesmanPopup = ({ onSave, onCancel }) => {
  const [salesman, setSalesman] = useState({
    name: "",
    phone: "",
    secondaryPhone: "",
    address: "",
    cnic: "",
    salary: "",
    joiningDate: new Date(),
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const handleChange = (e) =>
    setSalesman({ ...salesman, [e.target.name]: e.target.value });
  return (
    <Modal onCancel={onCancel} size="lg">
      <div className="p-8">
        <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Add New Salesman
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            name="name"
            value={salesman.name}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full p-3 bg-gray-100 rounded-xl outline-none"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="tel"
              name="phone"
              value={salesman.phone}
              onChange={handleChange}
              placeholder="Contact No"
              className="w-full p-3 bg-gray-100 rounded-xl outline-none"
            />
            <input
              type="tel"
              name="secondaryPhone"
              value={salesman.secondaryPhone}
              onChange={handleChange}
              placeholder="Secondary No (Optional)"
              className="w-full p-3 bg-gray-100 rounded-xl outline-none"
            />
          </div>
          <input
            type="text"
            name="address"
            value={salesman.address}
            onChange={handleChange}
            placeholder="Address"
            className="w-full p-3 bg-gray-100 rounded-xl outline-none"
          />
          <input
            type="text"
            name="cnic"
            value={salesman.cnic}
            onChange={handleChange}
            placeholder="CNIC (without dashes)"
            className="w-full p-3 bg-gray-100 rounded-xl outline-none"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              name="salary"
              value={salesman.salary}
              onChange={handleChange}
              placeholder="Salary"
              className="w-full p-3 bg-gray-100 rounded-xl outline-none"
            />
            <div className="relative">
              <input
                type="text"
                readOnly
                value={format(salesman.joiningDate, "dd MMM, yyyy")}
                onClick={() => setShowCalendar(!showCalendar)}
                placeholder="Joining Date"
                className="w-full p-3 bg-gray-100 rounded-xl outline-none cursor-pointer focus:scale-105 transition-transform duration-300 shadow-inner"
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-8">
          <button
            onClick={() => onSave(salesman)}
            className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105"
          >
            Save Salesman
          </button>
        </div>
      </div>
      {showCalendar && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white p-2 rounded-lg shadow-2xl border"
        >
          <DayPicker
            mode="single"
            selected={salesman.joiningDate}
            onSelect={(date) => {
              setSalesman({ ...salesman, joiningDate: date });
              setShowCalendar(false);
            }}
          />
        </motion.div>
      )}
    </Modal>
  );
};

const AddSalePopup = ({ onSave, onCancel, salesmanName }) => {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  return (
    <Modal onCancel={onCancel} size="sm">
      <div className="p-8">
        <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">
          Link Sale
        </h3>
        <p className="text-center text-gray-500 mb-6">for {salesmanName}</p>
        <div className="space-y-4">
          <input
            type="number"
            name="invoiceNumber"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Enter Invoice Number"
            className="w-full p-3 bg-gray-100 rounded-xl outline-none text-center text-lg"
          />
        </div>
        <div className="flex justify-end mt-8">
          <button
            onClick={() => onSave(invoiceNumber)}
            className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105"
          >
            Link Sale
          </button>
        </div>
      </div>
    </Modal>
  );
};
const ViewSalesHistoryPopup = ({
  salesman,
  onCancel,
  onViewInvoice,
  onSavePdf,
}) => {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const fetchSales = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/sales?salesmanId=${salesman._id}`);
        const data = await res.json();
        setSales(Array.isArray(data) ? data : []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSales();
  }, [salesman._id]);
  return (
    <Modal onCancel={onCancel} size="lg">
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-800">Sales History</h3>
        <p className="text-gray-500 mb-6">for {salesman.name}</p>
        <div className="max-h-96 overflow-y-auto pr-2">
          {isLoading ? (
            <p>Loading...</p>
          ) : sales.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-2">Inv #</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s._id} className="border-b">
                    <td className="p-3">{s.invoiceNumber}</td>
                    <td className="p-3">{s.customerName}</td>
                    <td className="p-3 text-right font-bold">
                      {s.subTotal.toFixed(0)}/-
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => onViewInvoice(s)}
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => onSavePdf(s)}
                          className="text-gray-500 hover:text-green-600"
                        >
                          <Save size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center py-8 text-gray-500">
              No sales found for this salesman.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
};

// FINAL COMPLETE INVOICE COMPONENT (Copied from sales/new page)
const DetailedInvoice = ({ sale, logoBase64, forPDF = false }) => {
  if (!sale) return null;
  const scaleClass = forPDF ? "" : "scale-[0.8] origin-top";
  return (
    <div
      id="invoice-pdf-content"
      className={`bg-white max-w-4xl mx-auto font-sans transform ${scaleClass}`}
      style={{ color: "#111827" }}
    >
      <div
        style={{
          position: "relative",
          width: "820px",
          height: "1160px",
          backgroundColor: "white",
          fontFamily: "sans-serif",
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
                <h1 style={{ fontSize: "2.25rem", fontWeight: "bold" }}>
                  INVOICE
                </h1>
                <p style={{ marginTop: "8px", color: "#4B5563" }}>
                  Invoice No. {String(sale.invoiceNumber).padStart(3, "0")}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#4B5563" }}>
                  {new Date(sale.invoiceDate).toLocaleDateString()}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#4B5563" }}>
                  {new Date(sale.invoiceDate).toLocaleTimeString()}
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
                  {logoBase64 && (
                  <Image src="/logo.png" alt="Mr. Denum Logo" width={50} height={50} />
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
                  {sale.customerName}
                </p>
                <p
                  style={{
                    textAlign: "right",
                    fontSize: "0.875rem",
                    color: "#4B5563",
                  }}
                >
                  {sale.customerPhone}
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
                  <th style={{ textAlign: "left", padding: "8px" }}>
                    Description
                  </th>
                  <th style={{ padding: "8px" }}>QTY</th>
                  <th style={{ padding: "8px" }}>Price</th>
                  <th style={{ padding: "8px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.items && sale.items.length > 0 ? (
                  sale.items.map((item, index) => {
                    const amount =
                      (parseFloat(item.qty) || 0) *
                      (parseFloat(item.price) || 0);
                    return (
                      <tr key={index}>
                        <td
                          style={{
                            border: "1px solid #E5E7EB",
                            padding: "6px",
                          }}
                        >
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
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center p-4">
                      Linked Sale - Full item details not available here.
                    </td>
                  </tr>
                )}
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
                      {sale.subTotal.toFixed(0)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600", paddingRight: "16px" }}>
                      Others:
                    </td>
                    <td style={{ textAlign: "right" }}>{sale.others || 0}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "600", paddingRight: "16px" }}>
                      Discount:
                    </td>
                    <td style={{ textAlign: "right" }}>{sale.discount || 0}</td>
                  </tr>
                  <tr style={{ fontWeight: "bold", fontSize: "1.125rem" }}>
                    <td style={{ paddingTop: "8px", paddingRight: "16px" }}>
                      Total:
                    </td>
                    <td style={{ paddingTop: "8px", textAlign: "right" }}>
                      {(sale.total || sale.subTotal).toFixed(0)}
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
                      {sale.receivedAmount || 0}
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
                      {(sale.balance || 0).toFixed(0)}
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
                    <span style={{ fontWeight: "600" }}>Bank Name:</span> UBL
                    Bank
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
                    <span style={{ fontWeight: "600" }}>Bank Name:</span> MCB
                    Bank
                  </p>
                  <p>
                    <span style={{ fontWeight: "600" }}>Account Name:</span>{" "}
                    Muhammad Waqar
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
              براہ کرم اپنی سامان موقع پر تسلی سے گن کر لیں۔ بعد میں ہم ذمہ دار
              نہ ہوں گے۔
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// ... Baaki components (SalesmanCard) ...
const SalesmanCard = ({ salesman, onAddSale, onViewSales, onDelete }) => {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl font-bold text-[#0D3A25]">
              {salesman.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {salesman.name}
              </h3>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Phone size={14} /> {salesman.phone}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Badge size={14} /> {salesman.cnic}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDelete(salesman._id)}
            className="text-gray-400 hover:text-red-500"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div className="border-t my-4"></div>
        <div className="text-sm space-y-2">
          <p className="flex justify-between">
            <strong>Joining Date:</strong>{" "}
            <span className="text-gray-700">
              {format(new Date(salesman.joiningDate), "dd MMM, yyyy")}
            </span>
          </p>
          <p className="flex justify-between">
            <strong>Salary:</strong>{" "}
            <span className="font-bold text-green-600">
              {salesman.salary.toLocaleString()}/-
            </span>
          </p>
          <p className="flex justify-between">
            <strong>Total Sales:</strong>{" "}
            <span className="font-bold text-blue-600">
              {salesman.totalSales.toLocaleString()}/-
            </span>
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <button
          onClick={() => onAddSale(salesman)}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 px-4 rounded-lg bg-[#0D3A25] hover:bg-opacity-90 transition-transform transform hover:scale-105"
        >
          {" "}
          <ShoppingCart size={16} /> Link a Sale
        </button>
        <button
          onClick={() => onViewSales(salesman)}
          className="w-full flex items-center justify-center gap-2 text-gray-800 font-semibold py-2.5 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 transition-transform transform hover:scale-105"
        >
          {" "}
          <Eye size={16} /> View Sales History
        </button>
      </div>
    </motion.div>
  );
};

// --- Main Page ---
export default function SalesmanPage() {
  const [salesmen, setSalesmen] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [popup, setPopup] = useState({ type: null, data: null });
  const [logoBase64, setLogoBase64] = useState(null);
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "",
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/salesmen");
      const data = await res.json();
      if (Array.isArray(data)) setSalesmen(data);
    } catch (error) {
      console.error("Failed to fetch salesmen:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const fetchLogo = async () => {
      try {
        const res = await fetch("/logo.png");
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error(e);
      }
    };
    fetchLogo();
  }, []);

  const showNotification = (message, type) => {
    setNotification({ visible: true, message, type });
    setTimeout(
      () => setNotification({ visible: false, message: "", type: "" }),
      3000
    );
  };
  const handleSaveSalesman = async (salesmanData) => {
    if (!salesmanData.name || !salesmanData.salary) return;
    await fetch("/api/salesmen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(salesmanData),
    });
    setPopup({ type: null });
    fetchData();
  };
  const handleDeleteSalesman = async () => {
    if (popup.type === "delete" && popup.data) {
      await fetch(`/api/salesmen/${popup.data}`, { method: "DELETE" });
      setPopup({ type: null });
      fetchData();
    }
  };
  const handleSaveSale = async (invoiceNumber) => {
    const salesman = popup.data;
    if (!invoiceNumber) {
      showNotification("Please enter an invoice number.", "error");
      return;
    }
    const res = await fetch("/api/sales/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNumber, salesmanId: salesman._id }),
    });
    if (res.ok) {
      showNotification("Sale linked successfully!", "success");
      setPopup({ type: null });
      fetchData();
    } else {
      const errorData = await res.json();
      showNotification(`Error: ${errorData.error}`, "error");
    }
  };

  const handleSaveAsPdf = (sale) => {
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    document.body.appendChild(tempDiv);
    const root = createRoot(tempDiv);
    root.render(
      <DetailedInvoice sale={sale} logoBase64={logoBase64} forPDF={true} />
    );
    setTimeout(() => {
      html2canvas(tempDiv.querySelector("#invoice-pdf-content"), {
        scale: 3,
        useCORS: true,
      }).then((canvas) => {
        const pdf = new jsPDF("p", "mm", "a4");
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          0,
          pdf.internal.pageSize.getWidth(),
          pdf.internal.pageSize.getHeight()
        );
        pdf.save(`invoice-${sale.invoiceNumber}.pdf`);
        root.unmount();
        document.body.removeChild(tempDiv);
      });
    }, 500);
  };

  const filteredSalesmen = salesmen.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalSalary = salesmen.reduce((sum, s) => sum + (s.salary || 0), 0);
  const topPerformer =
    salesmen.length > 0
      ? salesmen.sort((a, b) => b.totalSales - a.totalSales)[0]
      : { name: "N/A" };
  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {popup.type === "add_salesman" && (
          <AddSalesmanPopup
            onSave={handleSaveSalesman}
            onCancel={() => setPopup({ type: null })}
          />
        )}
        {popup.type === "delete" && (
          <ConfirmationPopup
            message="Are you sure?"
            onConfirm={handleDeleteSalesman}
            onCancel={() => setPopup({ type: null })}
          />
        )}
        {popup.type === "add_sale" && (
          <AddSalePopup
            onSave={handleSaveSale}
            onCancel={() => setPopup({ type: null })}
            salesmanName={popup.data.name}
          />
        )}
        {popup.type === "view_sales" && (
          <ViewSalesHistoryPopup
            salesman={popup.data}
            onCancel={() => setPopup({ type: null })}
            onViewInvoice={(sale) =>
              setPopup({ type: "view_invoice", data: sale })
            }
            onSavePdf={handleSaveAsPdf}
          />
        )}
        {popup.type === "view_invoice" && (
          <Modal
            onCancel={() =>
              setPopup({
                type: "view_sales",
                data: salesmen.find((s) => s._id === popup.data.salesmanId),
              })
            }
            size="xl"
          >
            <DetailedInvoice sale={popup.data} logoBase64={logoBase64} />
          </Modal>
        )}
        {notification.visible && (
          <NotificationPopup
            message={notification.message}
            type={notification.type}
            onClose={() =>
              setNotification({ visible: false, message: "", type: "" })
            }
          />
        )}
      </AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 max-w-7xl mx-auto"
      >
        <motion.div variants={itemVariants}>
          <h1 className="text-4xl font-bold">Sales Team</h1>
          <p className="text-gray-500 mt-1">
            Manage your sales team and their performance.
          </p>
        </motion.div>
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Users}
            title="Total Salesmen"
            value={salesmen.length}
          />
          <StatCard
            icon={BarChart}
            title="Top Performer"
            value={topPerformer.name}
          />
          <StatCard
            icon={DollarSign}
            title="Total Monthly Salaries"
            value={`${totalSalary.toLocaleString()}/-`}
          />
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-white/80 p-6 rounded-2xl shadow-lg"
        >
          <div className="flex justify-between items-center mb-5">
            <div className="relative w-72">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search salesman..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-full py-3 bg-white rounded-lg border-gray-200 outline-none focus:ring-2 focus:ring-transparent focus:border-[#0D3A25] focus:scale-105 transition-transform duration-300"
              />
            </div>
            <button
              onClick={() => setPopup({ type: "add_salesman" })}
              className="flex items-center gap-2 text-white font-semibold py-3 px-6 rounded-lg bg-[#0D3A25]"
            >
              <UserPlus size={18} /> Add Salesman
            </button>
          </div>
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr"
          >
            {filteredSalesmen.length > 0 ? (
              filteredSalesmen.map((salesman) => (
                <SalesmanCard
                  key={salesman._id}
                  salesman={salesman}
                  onAddSale={(s) => setPopup({ type: "add_sale", data: s })}
                  onViewSales={(s) => setPopup({ type: "view_sales", data: s })}
                  onDelete={(id) => setPopup({ type: "delete", data: id })}
                />
              ))
            ) : (
              <p className="col-span-3 text-center py-10">No salesmen found.</p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}
