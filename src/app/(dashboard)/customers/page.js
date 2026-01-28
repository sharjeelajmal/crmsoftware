"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Search,
  Hash,
  ShoppingCart,
  DollarSign,
  Calendar,
  MoreHorizontal,
  X,
  Eye,
  Trash2,
  AlertTriangle,
  Users,
  TrendingUp,
  Receipt,
  Edit2,
  UserCheck,
  EyeOff,
  FileText,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import Loader from "@/components/Loader";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import Image from "next/image";

// --- Reusable Components (No changes) ---
const Modal = ({ children, onCancel, size = "lg" }) => {
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
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
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
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20 cursor-pointer"
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
    <div className="text-center p-6">
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
          className="py-2 px-6 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 cursor-pointer"
        >
          Cancel
        </button>{" "}
        <button
          onClick={onConfirm}
          className="py-2 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 cursor-pointer"
        >
          Confirm Delete
        </button>{" "}
      </div>{" "}
    </div>{" "}
  </Modal>
);
const AddCustomerPopup = ({
  onSave,
  onCancel,
  initialData = { name: "", phone: "", city: "", openingBalance: 0 },
}) => {
  const [customer, setCustomer] = useState(initialData);
  const handleChange = (e) =>
    setCustomer({ ...customer, [e.target.name]: e.target.value });
  return (
    <Modal onCancel={onCancel}>
      {" "}
      <div className="p-8">
        <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Register Customer
        </h3>{" "}
        <div className="space-y-4">
          {" "}
          <input
            type="text"
            name="name"
            value={customer.name}
            onChange={handleChange}
            placeholder="Full Name"
            className="w-full p-3 bg-gray-100 rounded-xl outline-none"
          />{" "}
          <input
            type="tel"
            name="phone"
            value={customer.phone}
            onChange={handleChange}
            placeholder="Phone Number"
            className="w-full p-3 bg-gray-100 rounded-xl outline-none"
          />{" "}
          <input
            type="text"
            name="city"
            value={customer.city}
            onChange={handleChange}
            placeholder="City"
            className="w-full p-3 bg-gray-100 rounded-xl outline-none"
          />{" "}
          <input
            type="number"
            name="openingBalance"
            value={customer.openingBalance}
            onChange={handleChange}
            placeholder="Opening Balance (Dues)"
            className="w-full p-3 bg-gray-100 rounded-xl outline-none"
          />{" "}
        </div>{" "}
        <div className="flex justify-end mt-8">
          {" "}
          <button
            onClick={() => onSave(customer)}
            className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 transition-transform cursor-pointer"
          >
            Save Customer
          </button>{" "}
        </div>
      </div>{" "}
    </Modal>
  );
};

// ... (DetailedInvoice component waisa hi rahega) ...
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
                {sale.items
                  .filter((i) => i.desc)
                  .map((item, index) => {
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
                    Bashir Ahmad

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
// ... (ViewSalesPopup component waisa hi rahega) ...
const ViewSalesPopup = ({
  customerName,
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
        const res = await fetch(
          `/api/sales?customerName=${encodeURIComponent(customerName)}`
        );
        const data = await res.json();
        setSales(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch sales:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (customerName) fetchSales();
  }, [customerName]);
  return (
    <Modal onCancel={onCancel} size="lg">
      <div className="p-6">
        <div className="flex items-center mb-6">
          {" "}
          <Receipt size={24} className="text-[#0D3A25] mr-3" />{" "}
          <div>
            {" "}
            <h3 className="text-2xl font-bold text-gray-800">
              Sales History
            </h3>{" "}
            <p className="text-gray-500">For {customerName}</p>{" "}
          </div>{" "}
        </div>
        <div className="max-h-96 overflow-y-auto pr-2">
          {" "}
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading sales...</p>
          ) : sales.length > 0 ? (
            <table className="w-full text-left">
              <thead>
                {" "}
                <tr className="border-b">
                  {" "}
                  <th className="p-2 text-sm text-gray-500">Invoice #</th>{" "}
                  <th className="p-2 text-sm text-gray-500">Date</th>{" "}
                  <th className="p-2 text-sm text-gray-500 text-right">
                    Amount
                  </th>
                  <th className="p-2 text-sm text-gray-500 text-center">
                    Actions
                  </th>{" "}
                </tr>{" "}
              </thead>
              <tbody>
                {" "}
                {sales.map((sale) => (
                  <tr
                    key={sale._id}
                    className="border-b hover:bg-gray-50 cursor-default"
                  >
                    <td className="p-3 font-medium text-gray-700">
                      {String(sale.invoiceNumber).padStart(4, "0")}
                    </td>
                    <td className="p-3 text-gray-600">
                      {format(new Date(sale.invoiceDate), "dd MMM, yyyy")}
                    </td>
                    <td className="p-3 font-bold text-gray-800 text-right">
                      {sale.subTotal.toFixed(0)}/-
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-4">
                        <button
                          onClick={() => onViewInvoice(sale)}
                          title="View Invoice"
                          className="text-gray-500 hover:text-blue-600"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => onSavePdf(sale)}
                          title="Save as PDF"
                          className="text-gray-500 hover:text-green-600"
                        >
                          <Save size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}{" "}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No sales found for this customer.
            </p>
          )}{" "}
        </div>
      </div>
    </Modal>
  );
};
// ... (StatCard component waisa hi rahega) ...
const StatCard = ({ icon: Icon, title, value }) => (
  <motion.div
    variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
    className="flex items-center p-5 rounded-2xl text-white relative overflow-hidden"
    style={{ backgroundColor: "#0D3A25" }}
  >
    {" "}
    <div className="absolute -bottom-1 -right-1 w-24 h-24 bg-white/5 rounded-full"></div>{" "}
    <div className="p-3 bg-white/20 rounded-full mr-4">
      {" "}
      <Icon size={24} />{" "}
    </div>{" "}
    <div>
      {" "}
      <h3 className="text-md font-light">{title}</h3>{" "}
      <p className="text-2xl lg:text-3xl font-bold">{value}</p>{" "}
    </div>{" "}
  </motion.div>
);
// ... (EditableBalance component waisa hi rahega) ...
const EditableBalance = ({ customer, onUpdate, onAdjust, isNormal = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [balance, setBalance] = useState(customer.totalBalance);

   const handleSave = async () => {
        const newBalance = parseFloat(balance);
        
      if (isNaN(newBalance) || Math.abs(newBalance - customer.totalBalance) < 0.01) {
            setIsEditing(false); 
            setBalance(customer.totalBalance); 
            return;
        }

        try { 
            if (isNormal || customer.isNormal) {
                await onAdjust(customer, newBalance);
            } else {
                const salesBalanceOnly = customer.totalBalance - (customer.openingBalance || 0);
                const newOpeningBalance = newBalance - salesBalanceOnly;
                await onUpdate(customer._id, { openingBalance: newOpeningBalance });
            }
        } catch (error) {
             console.error("Failed to save balance:", error);
             setBalance(customer.totalBalance); 
        } finally {
             setIsEditing(false); 
        }
    };
    return (
        <div className="flex items-center gap-2">
            {isEditing ? (
                <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    className="font-bold text-lg text-red-600 bg-red-50 rounded-md p-1 w-24 text-right outline-none ring-2 ring-red-300"
                    autoFocus
                />
            ) : (
                <>
                    <p className="font-bold text-lg text-red-600">{(customer.totalBalance || 0).toLocaleString()}/-</p>
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-red-500 cursor-pointer">
                        <Edit2 size={14} />
                    </button>
                </>
            )}
        </div>
    );
};
// ... (MenuItem component waisa hi rahega) ...
const MenuItem = ({ icon: Icon, text, onClick, isDestructive = false }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors cursor-pointer ${
      isDestructive
        ? "text-red-600 hover:bg-red-50"
        : "text-gray-700 hover:bg-gray-100"
    }`}
  >
    {" "}
    <Icon size={16} /> {text}{" "}
  </button>
);
// ... (CustomerCard component waisa hi rahega) ...
const CustomerCard = ({
  customer,
  onViewSales,
  onDelete,
  onUpdateBalance,
  onRegister,
  onAdjustBalance,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isNormal = customer.isNormal;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const lastPurchase = customer.lastPurchaseDate ? format(new Date(customer.lastPurchaseDate), "dd MMM, yyyy") : "N/A";
  const customerId = customer._id ? customer._id.slice(-6).toUpperCase() : (customer.phone ? customer.phone.slice(-6) : "N/A");

  let status = { text: "New", color: "bg-blue-100 text-blue-800" };
  if (customer.lastPurchaseDate) {
    const daysSinceLastPurchase = (new Date() - new Date(customer.lastPurchaseDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPurchase <= 30) status = { text: "Active", color: "bg-green-100 text-green-800" };
    else status = { text: "Inactive", color: "bg-gray-100 text-gray-800" };
  }

  return (
    <motion.div variants={{hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 },}} whileHover={{ y: -5, boxShadow: "0px 15px 25px -5px rgba(0, 0, 0, 0.1)" }} className="bg-white rounded-2xl shadow-md p-5 flex flex-col justify-between transition-all duration-300 h-full">
        <div>
            <div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-bold text-[#0D3A25]">{customer.name.charAt(0).toUpperCase()}</div><div> <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3> <p className="text-sm text-gray-500">{customer.phone}</p> </div></div><div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>{status.text}</div></div>
        </div>
        <div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
                <DetailItem icon={Hash} label="Customer ID" value={customerId} />
                <DetailItem icon={ShoppingCart} label="Total Purchases" value={customer.totalPurchases || 0} />
                <DetailItem icon={DollarSign} label="Amount Spent" value={`${(customer.amountSpent || 0).toFixed(0)}/-`}/>
                <DetailItem icon={Calendar} label="Last Purchase" value={lastPurchase}/>
            </div>
            <div className="border-t pt-4 flex justify-between items-center">
                <div>
                    <p className="text-xs text-gray-500">Total Balance</p>
                    <EditableBalance customer={customer} onUpdate={onUpdateBalance} onAdjust={onAdjustBalance} isNormal={isNormal} />
                </div>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"><MoreHorizontal size={20} /></button>
                    <AnimatePresence>
                        {menuOpen && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-xl z-10 overflow-hidden">
                            <MenuItem icon={Eye} text="View Sales" onClick={() => { onViewSales(customer.name); setMenuOpen(false); }} />
                            {isNormal ? <MenuItem icon={UserCheck} text="Register Customer" onClick={() => {onRegister(customer); setMenuOpen(false);}}/> : <MenuItem icon={Trash2} text="Remove Customer" isDestructive={true} onClick={() => { onDelete(customer._id); setMenuOpen(false); }} />}
                        </motion.div>)}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    </motion.div>
  );
};
// ... (DetailItem component waisa hi rahega) ...
const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start">
    {" "}
    <Icon size={16} className="text-gray-400 mt-0.5 mr-2 flex-shrink-0" />{" "}
    <div>
      {" "}
      <p className="text-xs text-gray-500">{label}</p>{" "}
      <p className="font-semibold text-gray-800">{value}</p>{" "}
    </div>{" "}
  </div>
);


// --- MAIN PAGE COMPONENT ---
export default function CustomersPage() {
  const [viewMode, setViewMode] = useState("registered");
  const [customers, setCustomers] = useState([]);
  const [normalCustomers, setNormalCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [popup, setPopup] = useState({ type: null, data: null });
  const [invoicePopup, setInvoicePopup] = useState({
    visible: false,
    data: null,
  });
  const [logoBase64, setLogoBase64] = useState(null);

  useEffect(() => {
    fetchData();
    const fetchLogo = async () => {
      try {
        const res = await fetch("/logo.png");
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result);
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Error fetching logo:", error);
      }
    };
    fetchLogo();
  }, []);

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
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(
          canvas.toDataURL("image/png"),
          "PNG",
          0,
          0,
          pdfWidth,
          pdfHeight
        );
        pdf.save(`invoice-${sale.invoiceNumber}.pdf`);
        root.unmount();
        document.body.removeChild(tempDiv);
      });
    }, 500);
  };

 const fetchData = async () => {
    setIsLoading(true);
    try {
      const cacheBuster = `_=${new Date().getTime()}`;
      const [regRes, normRes] = await Promise.all([
        fetch(`/api/customers?${cacheBuster}`),
        fetch(`/api/customers?view=normal&${cacheBuster}`),
      ]);

      const regData = await regRes.json();
      const normData = await normRes.json();

      setCustomers(Array.isArray(regData) ? regData : []);
      setNormalCustomers(Array.isArray(normData) ? normData : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSaveCustomer = async (customer) => {
    if (!customer.name || !customer.phone) {
      alert("Name and Phone are required.");
      return;
    }
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...customer,
        openingBalance: parseFloat(customer.openingBalance) || 0,
      }),
    });
    setPopup({ type: null, data: null });
    fetchData();
  };
  const confirmDelete = async () => {
    if (popup.type === "delete" && popup.data) {
      await fetch(`/api/customers/${popup.data}`, { method: "DELETE" });
      setPopup({ type: null, data: null });
      fetchData();
    }
  };
  const handleUpdateBalance = async (customerId, updatedData) => {
    await fetch(`/api/customers/${customerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    fetchData();
  };

  // --- *** YEH FUNCTION UPDATE KIYA GAYA HAI (FIX) *** ---
  const handleAdjustNormalBalance = async (customer, newTotalBalance) => {
    // Yeh function ab "Normal Customer" ko "Register" karega
    // aur balance difference ko "openingBalance" mein save karega.
    // Yeh "0-amount sale" (Issue 2) ko solve karega aur balance ko permanent (Issue 1) banayega.

    try {
        // 1. Calculate karein ke naya openingBalance kya hona chahiye
        const salesBalanceOnly = customer.totalBalance || 0; // Normal customer ka opening balance 0 hota hai
        const newOpeningBalance = parseFloat(newTotalBalance) - salesBalanceOnly;

        // 2. Naya customer object banayein
        const newCustomerData = {
            name: customer.name,
            phone: customer.phone,
            city: customer.city || "N/A", // Purana data use karein agar hai
            openingBalance: newOpeningBalance
        };

        // 3. Naya customer save karne ke liye POST API call karein
        await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCustomerData),
        });

    } catch (error) {
        console.error("Failed to adjust normal balance by registering:", error);
    } finally {
        fetchData(); // Data refresh karein
    }
  };
  // --- *** END FIX *** ---


  const currentList = viewMode === "registered" ? customers : normalCustomers;
  const filteredCustomers = currentList.filter((c) => {
    const customerId = c._id
      ? c._id.slice(-6).toUpperCase()
      : c.phone
      ? c.phone.slice(-6)
      : "";
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (customerId && customerId.includes(searchTerm.toUpperCase()))
    );
  });
  const totalDues =
    customers.reduce((sum, customer) => sum + (customer.totalBalance || 0), 0) +
    normalCustomers.reduce(
      (sum, customer) => sum + (customer.totalBalance || 0),
      0
    );
  const topCustomer =
    [...customers, ...normalCustomers].length > 0
      ? [...customers, ...normalCustomers].reduce((prev, current) =>
          (prev.amountSpent || 0) > (current.amountSpent || 0) ? prev : current
        )
      : { name: "N/A" };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };

  if (isLoading) return <Loader />;

  return (
    <>
      <AnimatePresence>
        {popup.type === "add" && (
          <AddCustomerPopup
            onSave={handleSaveCustomer}
            onCancel={() => setPopup({ type: null, data: null })}
            initialData={popup.data}
          />
        )}
        {popup.type === "delete" && (
          <ConfirmationPopup
            message="Do you really want to remove this customer?"
            onConfirm={confirmDelete}
            onCancel={() => setPopup({ type: null, data: null })}
          />
        )}
        {popup.type === "view_sales" && (
          <ViewSalesPopup
            customerName={popup.data}
            onCancel={() => setPopup({ type: null, data: null })}
            onViewInvoice={(sale) =>
              setInvoicePopup({ visible: true, data: sale })
            }
            onSavePdf={handleSaveAsPdf}
          />
        )}
        {invoicePopup.visible && (
          <Modal
            onCancel={() => setInvoicePopup({ visible: false, data: null })}
            size="xl"
          >
            <DetailedInvoice sale={invoicePopup.data} logoBase64={logoBase64} />
          </Modal>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={Users}
            title="Total Customers"
            value={customers.length + normalCustomers.length}
          />
          <StatCard
            icon={DollarSign}
            title="Total Outstanding Dues"
            value={`${totalDues.toLocaleString()}/-`}
          />
          <StatCard
            icon={TrendingUp}
            title="Top Spender"
            value={topCustomer.name}
          />
        </motion.div>

        <motion.div
          variants={containerVariants}
          className="bg-white/50 p-6 rounded-2xl shadow-lg backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {viewMode === "registered"
                ? "Registered Customers"
                : "Normal Customers"}
            </h2>
            <button
              onClick={() =>
                setViewMode(viewMode === "registered" ? "normal" : "registered")
              }
              className="flex items-center justify-center w-full md:w-auto text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 bg-[#0D3A25] cursor-pointer"
            >
              {viewMode === "registered" ? (
                <Eye size={16} className="mr-2" />
              ) : (
                <EyeOff size={16} className="mr-2" />
              )}
              {viewMode === "registered"
                ? `View Normal (${normalCustomers.length})`
                : `View Registered (${customers.length})`}
            </button>
          </div>

          <div className="relative mb-6">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by name, phone, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-full bg-white rounded-lg border-gray-200 outline-none focus:scale-[1.01] transition-transform duration-300"
            />
          </div>

          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr"
          >
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer._id || (customer.name + customer.phone)}
                  customer={customer}
                  onViewSales={(name) =>
                    setPopup({ type: "view_sales", data: name })
                  }
                  onDelete={(id) => setPopup({ type: "delete", data: id })}
                  onUpdateBalance={handleUpdateBalance}
                  onRegister={(cust) =>
                    setPopup({
                      type: "add",
                      data: {
                        name: cust.name,
                        phone: cust.phone,
                        city: "",
                        // --- *** YEH LOGIC BHI FIX KI GAYI HAI (FIX) *** ---
                        // Register karte waqt openingBalance 0 rakhein, kyunki balance sales se aa raha hai
                        openingBalance: 0, 
                      },
                    })
                  }
                  onAdjustBalance={handleAdjustNormalBalance} // Naya prop yahan pass karein
                />
              ))
            ) : (
              <p className="text-center text-gray-500 py-10 col-span-full">
                No customers found.
              </p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}