"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  FileText,
  Save,
  UserPlus,
  Trash2,
  Check,
  X,
  Calendar,
  AlertTriangle,
  Edit, // Edit icon import kiya
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import Loader from "@/components/Loader";
import Image from "next/image";

// --- Reusable Components ---
const Modal = ({ children, onCancel, size = "xl" }) => {
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
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`bg-white rounded-2xl shadow-xl w-full ${sizeClasses[size]} relative flex flex-col`}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer z-20"
        >
          <X size={24} />
        </button>
        <div className="p-1 sm:p-2 overflow-y-auto max-h-[90vh]">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConfirmationPopup = ({ message, onConfirm, onCancel }) => (
  <Modal onCancel={onCancel} size="sm">
    <div className="text-center p-4">
      <AlertTriangle className="mx-auto text-yellow-500" size={48} />
      <h3 className="text-xl font-bold mt-4 mb-2 text-gray-800">
        Are you sure?
      </h3>
      <p className="my-4 text-md text-gray-600">{message}</p>
      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={onCancel}
          className="py-2 px-6 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="py-2 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
        >
          Confirm Delete
        </button>
      </div>
    </div>
  </Modal>
);

// --- ULTRA MODERN PRO EDIT POPUP (FIXED) ---
const EditSalePopup = ({ sale, onSave, onCancel }) => {
  const [formData, setFormData] = useState({ ...sale });
  const themeColor = "#0D3A25"; 

  // Logic wahi rahegi
  const handleItemChange = (index, field, value) => {
      const newItems = [...formData.items];
      newItems[index][field] = value;
      setFormData({ ...formData, items: newItems });
  };

  const handleFieldChange = (field, value) => {
      setFormData({ ...formData, [field]: value });
  };

  useEffect(() => {
      const newSubTotal = formData.items.reduce((acc, item) => 
          acc + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0), 0
      );
      const newTotal = newSubTotal + (parseFloat(formData.others) || 0) - (parseFloat(formData.discount) || 0);
      const newBalance = newTotal - (parseFloat(formData.receivedAmount) || 0);

      setFormData(prev => ({
          ...prev,
          subTotal: newSubTotal,
          total: newTotal,
          balance: newBalance
      }));
  }, [formData.items, formData.others, formData.discount, formData.receivedAmount]);

  // --- Pro Animation Variants ---
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

  const modalVariants = {
    hidden: { scale: 0.95, opacity: 0, y: 20 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 25, mass: 0.5 } 
    },
    exit: { scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.2 } }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.05, duration: 0.3 }
    })
  };

  // --- Modern Input Styles ---
  const InputGroup = ({ label, icon: Icon, value, onChange, type = "text", placeholder, className = "" }) => (
    <div className={`relative group ${className}`}>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1 transition-colors group-focus-within:text-[#0D3A25]">
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0D3A25] transition-colors" size={18} />}
        <input 
          type={type} 
          value={value} 
          onChange={onChange} 
          placeholder={placeholder}
          className={`w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl px-4 py-3 ${Icon ? 'pl-10' : ''} outline-none focus:bg-white focus:ring-2 focus:ring-[#0D3A25]/20 focus:border-[#0D3A25] transition-all duration-300 shadow-sm`} 
        />
      </div>
    </div>
  );

  return (
      <motion.div 
        initial="hidden" 
        animate="visible" 
        exit="hidden"
        variants={overlayVariants}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      >
          <motion.div 
            variants={modalVariants}
            className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
              {/* --- Header --- */}
              <div className="bg-[#0D3A25] p-6 flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>
                
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Edit className="text-white/80" size={24}/> Edit Invoice
                  </h2>
                  <div className="flex items-center gap-4 mt-2 text-green-100/80 text-sm">
                    <span className="bg-white/10 px-3 py-1 rounded-full">#{String(formData.invoiceNumber).padStart(4, '0')}</span>
                    <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(formData.invoiceDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <button onClick={onCancel} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors relative z-10">
                  <X size={20} />
                </button>
              </div>

              {/* --- Scrollable Content --- */}
              <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar bg-gray-50/50 flex-grow">
                  
                  {/* Customer Info Card */}
                  <motion.div variants={sectionVariants} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputGroup 
                          label="Customer Name" 
                          icon={UserPlus} 
                          value={formData.customerName} 
                          onChange={(e) => handleFieldChange('customerName', e.target.value)} 
                        />
                        <InputGroup 
                          label="Contact Number" 
                          icon={Check} 
                          value={formData.customerPhone} 
                          onChange={(e) => handleFieldChange('customerPhone', e.target.value)} 
                        />
                    </div>
                  </motion.div>

                  {/* Items Table */}
                  <motion.div variants={sectionVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-700 flex items-center gap-2"><FileText size={18} className="text-[#0D3A25]"/> Order Items</h3>
                      <span className="text-xs font-medium text-gray-400 bg-white px-2 py-1 rounded border">Total Items: {formData.items.length}</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full">
                          <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                              <tr style={{ backgroundColor: `${themeColor}15` }}>
                                  <th className="p-4 text-left">Product Details</th>
                                  <th className="p-4 text-center w-32">Qty</th>
                                  <th className="p-4 text-center w-32">Price (Rs)</th>
                                  <th className="p-4 text-right w-40">Total</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {formData.items.map((item, index) => (
                                  <motion.tr 
                                    key={index} 
                                    custom={index}
                                    variants={rowVariants}
                                    className="hover:bg-gray-50/80 transition-colors group"
                                  >
                                      <td className="p-3">
                                        <input 
                                          type="text" 
                                          value={item.desc} 
                                          onChange={(e) => handleItemChange(index, 'desc', e.target.value)} 
                                          className="w-full bg-transparent border-b border-transparent focus:border-[#0D3A25] outline-none py-1 text-gray-700 font-medium transition-colors"
                                        />
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-center justify-center bg-gray-100 rounded-lg px-2 py-1 w-24 mx-auto group-hover:bg-white group-hover:shadow-inner transition-all">
                                          <input 
                                            type="number" 
                                            value={item.qty} 
                                            onChange={(e) => handleItemChange(index, 'qty', e.target.value)} 
                                            className="w-full bg-transparent text-center outline-none text-sm font-semibold text-gray-700"
                                          />
                                        </div>
                                      </td>
                                      <td className="p-3">
                                        <div className="flex items-center justify-center bg-gray-100 rounded-lg px-2 py-1 w-24 mx-auto group-hover:bg-white group-hover:shadow-inner transition-all">
                                          <input 
                                            type="number" 
                                            value={item.price} 
                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                                            className="w-full bg-transparent text-center outline-none text-sm font-semibold text-gray-700"
                                          />
                                        </div>
                                      </td>
                                      <td className="p-4 text-right font-bold text-gray-800">
                                        {((parseFloat(item.qty)||0) * (parseFloat(item.price)||0)).toLocaleString()}/-
                                      </td>
                                  </motion.tr>
                              ))}
                          </tbody>
                      </table>
                    </div>
                  </motion.div>

                  {/* Footer / Financials */}
                  <motion.div variants={sectionVariants} className="flex flex-col lg:flex-row justify-end gap-8">
                      
                      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 w-full lg:w-[400px] space-y-4 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-20 h-20 bg-[#0D3A25]/5 rounded-bl-full -mr-4 -mt-4"></div>
                           
                           <div className="flex justify-between text-sm">
                              <span className="text-gray-500 font-medium">Sub Total</span> 
                              <span className="font-bold text-gray-800 text-lg">{formData.subTotal.toLocaleString()}/-</span>
                           </div>
                           
                           <div className="flex justify-between items-center gap-4">
                              <span className="text-gray-500 font-medium text-sm">Others (+)</span>
                              <input type="number" value={formData.others} onChange={(e) => handleFieldChange('others', e.target.value)} className="w-28 text-right bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-[#0D3A25] transition-colors" />
                           </div>
                           
                           <div className="flex justify-between items-center gap-4">
                              <span className="text-gray-500 font-medium text-sm">Discount (-)</span>
                              <input type="number" value={formData.discount} onChange={(e) => handleFieldChange('discount', e.target.value)} className="w-28 text-right bg-red-50 border border-red-100 text-red-600 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-red-300 transition-colors" />
                           </div>

                           <div className="border-t border-dashed border-gray-200 my-2"></div>

                           <div className="flex justify-between items-center">
                              <span className="text-[#0D3A25] font-bold text-lg">Net Total</span> 
                              <span className="font-extrabold text-2xl text-[#0D3A25]">{formData.total.toLocaleString()}/-</span>
                           </div>

                           <div className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                              <span className="text-gray-600 font-bold text-sm">Received Amount</span>
                              <input type="number" value={formData.receivedAmount} onChange={(e) => handleFieldChange('receivedAmount', e.target.value)} className="w-32 text-right bg-white border border-gray-200 rounded-lg px-3 py-2 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-[#0D3A25]/20 transition-all" />
                           </div>
                           
                           <motion.div 
                              animate={{ 
                                backgroundColor: formData.balance > 0 ? "#FEF2F2" : "#ECFDF5",
                                borderColor: formData.balance > 0 ? "#FECACA" : "#A7F3D0"
                              }}
                              className="p-4 rounded-xl border flex justify-between items-center transition-colors duration-300"
                           >
                              <span className={`font-bold text-sm ${formData.balance > 0 ? "text-red-600" : "text-green-700"}`}>
                                {formData.balance > 0 ? "Balance Due" : "Change Return"}
                              </span>
                              <span className={`font-extrabold text-2xl ${formData.balance > 0 ? "text-red-600" : "text-green-700"}`}>
                                {Math.abs(formData.balance).toLocaleString()}/-
                              </span>
                           </motion.div>
                      </div>
                  </motion.div>
              </div>

              {/* --- Bottom Action Bar --- */}
              <div className="p-5 border-t border-gray-100 bg-white flex justify-end gap-4 shrink-0">
                   <button 
                    onClick={onCancel} 
                    className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors text-sm"
                   >
                    Cancel
                   </button>
                   <motion.button 
                    whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(13, 58, 37, 0.4)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSave(formData)} 
                    className="px-8 py-3 bg-[#0D3A25] text-white rounded-xl font-bold shadow-lg shadow-[#0D3A25]/20 flex items-center gap-2 transition-all"
                   >
                    <Save size={18} /> Save Changes
                   </motion.button>
              </div>
          </motion.div>
      </motion.div>
  );
};
// --- DetailedInvoice (Waisa hi rahega) ---
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

// --- Main Page Component ---
export default function SalesPage() {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [popup, setPopup] = useState({ type: null, data: null });
  const [existingCustomers, setExistingCustomers] = useState(new Set());
  const [logoBase64, setLogoBase64] = useState(null);

  useEffect(() => {
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
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [salesRes, customersRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/customers"),
      ]);
      const salesData = await salesRes.json();
      const customersData = await customersRes.json();
      setSales(Array.isArray(salesData) ? salesData : []);
      if (Array.isArray(customersData)) {
        const customerSet = new Set(
          customersData.map((c) => `${c.name.trim()}-${c.phone.trim()}`)
        );
        setExistingCustomers(customerSet);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
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

  const handleAddCustomer = async (sale) => {
    const customerIdentifier = `${sale.customerName.trim()}-${sale.customerPhone.trim()}`;
    if (existingCustomers.has(customerIdentifier)) return;
    const customerData = {
      name: sale.customerName,
      phone: sale.customerPhone,
      city: "N/A",
      openingBalance: 0,
    };
    await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customerData),
    });
    setExistingCustomers((prev) => new Set(prev).add(customerIdentifier));
  };
  
  const handleDeleteSale = (saleId) => setPopup({ type: "delete", data: saleId });
  const handleViewInvoice = (sale) => setPopup({ type: "view", data: sale });
  // Edit Handle
  const handleEditSale = (sale) => setPopup({ type: "edit", data: sale });

  const confirmDelete = async () => {
    if (popup.type === "delete" && popup.data) {
      await fetch(`/api/sales/${popup.data}`, { method: "DELETE" });
      setPopup({ type: null, data: null });
      fetchData();
    }
  };

  // Function to save Edited Sale
  const confirmUpdateSale = async (updatedSale) => {
      await fetch(`/api/sales/${updatedSale._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSale)
      });
      setPopup({ type: null, data: null });
      fetchData();
  };

  const filteredSales = sales.filter((sale) =>
    sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <AnimatePresence>
        {popup.type === "delete" && (
          <ConfirmationPopup
            message="Do you really want to delete this sale? The items will be returned to stock."
            onConfirm={confirmDelete}
            onCancel={() => setPopup({ type: null, data: null })}
          />
        )}
        {popup.type === "view" && (
          <Modal
            onCancel={() => setPopup({ type: null, data: null })}
            size="xl"
          >
            <DetailedInvoice sale={popup.data} logoBase64={logoBase64} />
          </Modal>
        )}
        {/* Edit Popup Show */}
        {popup.type === "edit" && (
          <EditSalePopup 
            sale={popup.data} 
            onSave={confirmUpdateSale} 
            onCancel={() => setPopup({ type: null, data: null })}
          />
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full space-y-6"
      >
        <motion.header
          variants={itemVariants}
          className="flex justify-between items-center"
        >
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by Customer"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 w-72 bg-white rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#0D3A25]"
            />
          </div>
        </motion.header>
        <motion.div
          variants={itemVariants}
          className="bg-white p-6 rounded-2xl shadow-lg"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Sales History</h2>
            <Link href="/sales/new">
              <ActionButton>
                <Plus size={16} className="mr-2" /> Add New Sale
              </ActionButton>
            </Link>
          </div>
          <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium">
            <span className="flex-grow">Customer Name</span>
            <span className="w-24 text-center">Invoice #</span>
            <span className="w-32 text-center">Date</span>
            <span className="w-24 text-center">Amount</span>
            <span className="w-48 text-center">Actions</span>
          </div>

          <motion.div variants={containerVariants} className="space-y-3">
            {filteredSales.length > 0 ? (
              filteredSales.map((sale) => {
                const customerIdentifier = `${sale.customerName.trim()}-${sale.customerPhone.trim()}`;
                const isCustomerAdded =
                  existingCustomers.has(customerIdentifier);

                return (
                  <motion.div
                    key={sale._id}
                    variants={itemVariants}
                    className="flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl text-white transition-transform transform hover:scale-[1.01]"
                    style={{ backgroundColor: "#0D3A25" }}
                  >
                    <div className="flex-grow mb-3 md:mb-0">
                      <p className="font-medium">{sale.customerName}</p>
                      <p className="text-xs text-gray-300 md:hidden">
                        Inv# {String(sale.invoiceNumber).padStart(4, "0")} -{" "}
                        {new Date(sale.invoiceDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="hidden md:inline-block w-24 text-center">
                      {String(sale.invoiceNumber).padStart(4, "0")}
                    </span>
                    <span className="hidden md:inline-block w-32 text-center">
                      {new Date(sale.invoiceDate).toLocaleDateString()}
                    </span>
                    <span className="w-24 text-center font-bold md:font-normal">
                      {sale.subTotal.toFixed(0)}/-
                    </span>
                    <div className="w-full md:w-48 flex justify-end md:justify-center gap-4 mt-3 md:mt-0">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditSale(sale)}
                        title="Edit Invoice"
                        className="cursor-pointer transition-transform hover:scale-125"
                      >
                        <Edit size={18} />
                      </button>
                      
                      <button
                        onClick={() => handleViewInvoice(sale)}
                        title="View Invoice"
                        className="cursor-pointer transition-transform hover:scale-125"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => handleSaveAsPdf(sale)}
                        title="Save as PDF"
                        className="cursor-pointer transition-transform hover:scale-125"
                      >
                        <Save size={18} />
                      </button>
                      {isCustomerAdded ? (
                        <Check
                          size={18}
                          className="text-green-400"
                          title="Customer Already Saved"
                        />
                      ) : (
                        <button
                          onClick={() => handleAddCustomer(sale)}
                          title="Add to Customers"
                          className="cursor-pointer transition-transform hover:scale-125"
                        >
                          <UserPlus size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSale(sale._id)}
                        title="Delete Sale"
                        className="cursor-pointer transition-transform hover:scale-125"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <p className="text-center text-gray-500 py-8">No sales found.</p>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}

const ActionButton = ({ children }) => (
  <button
    className="flex items-center text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
    style={{ backgroundColor: "#0D3A25" }}
  >
    {children}
  </button>
);