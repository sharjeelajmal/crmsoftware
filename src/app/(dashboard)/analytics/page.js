"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  Clock,
  AlertTriangle,
  FileText,
  Save,
  X,
  Activity,
  Calendar,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createRoot } from "react-dom/client";
import Loader from "@/components/Loader";
import Image from "next/image";
// --- NAYI IMPORTS ---
import { DayPicker } from "react-day-picker"; // react-datepicker ki jagah
import "react-day-picker/dist/style.css"; // Nayi CSS
import { format } from "date-fns"; // Date format ke liye

// --- Reusable Components ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

// --- Animation (Smooth & Slow) ---
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

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

// --- Invoice Modal (Changes from previous step) ---
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
      {" "}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, rotateY: 90, rotateX: 30 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0, rotateX: 0 }}
        exit={{ scale: 0.8, opacity: 0, rotateY: -90, rotateX: -30 }}
        transition={{ type: "spring", stiffness: 150, damping: 20, duration: 0.5 }}
        className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} relative flex flex-col`} // overflow-hidden removed
        style={{ perspective: "1500px", transformStyle: "preserve-3d", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
      >
        {" "}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-[60] cursor-pointer" // z-index increased
        >
          <X size={24} />
        </button>{" "}
        <div className="p-1 sm:p-2 overflow-y-auto max-h-[90vh]">{children}</div>{" "}
      </motion.div>{" "}
    </motion.div>
  );
};

// FINAL COMPLETE INVOICE COMPONENT (No changes)
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
                {(sale.items || [])
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

// --- Main Page ---
export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("today");
  const [isLoading, setIsLoading] = useState(true);
  const [popup, setPopup] = useState({ type: null, data: null });
  const [logoBase64, setLogoBase64] = useState(null);

  // --- Calendar States (UPDATED) ---
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  // Yeh state ab temporary range rakhegi jab tak user "Apply" nahi karta
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });

  // Yeh state woh range rakhegi jo user ne "Apply" button se confirm ki hai
  const [appliedDateRange, setAppliedDateRange] = useState({
    from: undefined,
    to: undefined,
  });
  
  // 'isSelectingRange' state ki ab zaroorat nahi hai
  // const [isSelectingRange, setIsSelectingRange] = useState(false);


  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const logoRes = await fetch("/logo.png");
        const logoBlob = await logoRes.blob();
        const reader = new FileReader();
        reader.readAsDataURL(logoBlob);
        reader.onloadend = () => setLogoBase64(reader.result);
      } catch (error) {
        console.error("Failed to load logo:", error);
      }
    };
    fetchLogo();
  }, []);

  // --- *** DATA FETCHING LOGIC (NAYA FIX) *** ---
  useEffect(() => {
    const fetchData = async () => {
      
      // Agar filter 'custom' hai lekin 'applied' range complete nahi, to data fetch NAHI karna
      if (filter === "custom" && (!appliedDateRange.from || !appliedDateRange.to)) {
          setData(null); // Data clear kar dein
          setIsLoading(false); // Loader band kar dein
          return; // Function se bahar nikal jayein
      }

      setIsLoading(true);
      let url = `/api/analytics?filter=${filter}`;
      
      // Sirf tab URL change karein jab filter 'custom' ho AUR 'applied' range complete ho
      if (filter === "custom" && appliedDateRange.from && appliedDateRange.to) {
        url = `/api/analytics?filter=custom&from=${appliedDateRange.from.toISOString().split("T")[0]}&to=${appliedDateRange.to.toISOString().split("T")[0]}`;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("API request failed");
        const analyticsData = await res.json();
        setData(analyticsData);
      } catch (error) {
        console.error("Fetch Error:", error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Ab yeh 'isSelectingRange' ke baghair chalega
    fetchData();
    
  }, [filter, appliedDateRange]); // Dependency ab 'filter' aur 'appliedDateRange' par hai
  // --- *** END DATA FETCHING LOGIC *** ---


  const handleSaveAsPdf = (sale) => {
    // (No changes here)
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    document.body.appendChild(tempDiv);
    const root = createRoot(tempDiv);
    root.render(
      <DetailedInvoice sale={sale} logoBase64={logoBase64} forPDF={true} />
    );
    setTimeout(() => {
      const content = tempDiv.querySelector("#invoice-pdf-content");
      if (content) {
        html2canvas(content, { scale: 3, useCORS: true }).then((canvas) => {
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
      }
    }, 500);
  };

  // --- *** DATE SELECT LOGIC (UPDATED) *** ---
  // Yeh function ab sirf temporary 'dateRange' state ko update karega
  const handleDateSelect = (range) => {
      setDateRange(range); // 1. Sirf temporary range state update karo
  };
  // --- *** END DATE SELECT LOGIC *** ---

  // --- *** NAYA FUNCTION: APPLY BUTTON KE LIYE *** ---
  const handleApplyRange = () => {
      if (dateRange.from && dateRange.to) {
          setAppliedDateRange(dateRange); // 1. Confirmed (applied) range set karo
          setFilter('custom');           // 2. Filter set karo (taake useEffect trigger ho)
          setShowCalendarModal(false);     // 3. Modal band kar do
      } else {
          // Button disabled hoga, lekin safety ke liye
          alert("Please select a complete date range (from and to).");
      }
  };
  // --- *** END NAYA FUNCTION *** ---


  const FilterButton = ({ value, label, onClick }) => (
    <button
      onClick={onClick || (() => {
          setFilter(value);
          // Custom range ko reset karein
          setDateRange({ from: undefined, to: undefined });
          // *** YEH LINE ADD KI GAYI HAI ***
          setAppliedDateRange({ from: undefined, to: undefined }); // Applied range bhi reset karein
      })}
      className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
        (filter === value)
          ? "bg-[#0D3A25] text-white shadow-md"
          : "bg-white text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  if (isLoading) {
    return <Loader />;
  }

  return (
    <>
      <AnimatePresence>
        {" "}
        {popup.type === "view_invoice" && (
          <Modal
            onCancel={() => setPopup({ type: null, data: null })}
            size="xl"
          >
            {" "}
            <DetailedInvoice sale={popup.data} logoBase64={logoBase64} />{" "}
          </Modal>
        )}{" "}

        {/* --- Naya Modern Calendar Modal (UPDATED) --- */}
        {showCalendarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Backdrop (background) pe click karne se band hoga
            onClick={() => {
                setShowCalendarModal(false);
                // *** FIX: Temporary range ko reset kar ke 'applied' range par set karein ***
                setDateRange(appliedDateRange); 
                // Agar range poori nahi thi to filter reset karein
                if (filter === 'custom' && (!appliedDateRange.from || !appliedDateRange.to)) {
                    setFilter('today'); // ya jo bhi default hai
                }
            }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              // Calendar container
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-4 relative"
            >
              {/* --- Naya Working Close Button (UPDATED) --- */}
              <button
                onClick={() => {
                    setShowCalendarModal(false);
                    // *** FIX: Temporary range ko reset kar ke 'applied' range par set karein ***
                    setDateRange(appliedDateRange);
                    // Agar range poori nahi thi to filter reset karein
                    if (filter === 'custom' && (!appliedDateRange.from || !appliedDateRange.to)) {
                       setFilter('today'); // ya jo bhi default hai
                    }
                }}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              <DayPicker
                mode="range"
                selected={dateRange} // Calendar ab temporary 'dateRange' state se link hai
                onSelect={handleDateSelect} // Updated handler
                numberOfMonths={2} 
                defaultMonth={dateRange.from || new Date()} 
                captionLayout="dropdown-buttons" 
                fromYear={2020}
                toYear={new Date().getFullYear() + 1}
              />

              {/* --- *** YAHAN NAYA BUTTON ADD KIYA GAYA HAI *** --- */}
              <div className="flex justify-end p-2 border-t border-gray-200 mt-2">
                  <button
                      onClick={handleApplyRange} // Naya handler function
                      disabled={!dateRange.from || !dateRange.to} // Disable karein jab tak range poori na ho
                      className="px-6 py-2 bg-[#0D3A25] text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90"
                  >
                      Apply Range
                  </button>
              </div>
              {/* --- *** END NAYA BUTTON *** --- */}

            </motion.div>
          </motion.div>
        )}
        {/* --- End Naya Modal --- */}
        
      </AnimatePresence>
      
      {/* --- Calendar Custom CSS (No changes) --- */}
      <style jsx global>{`
        .rdp {
          --rdp-cell-size: 44px;
          --rdp-caption-font-size: 1.1rem;
          --rdp-accent-color: #0D3A25; /* Theme color */
          --rdp-background-color: #f0fdf4; /* Light green */
          
          margin: 1em;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          padding: 1rem;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .rdp-day_selected, .rdp-day_selected:hover {
            background-color: var(--rdp-accent-color) !important;
            color: white !important;
        }
        .rdp-day_range_start, .rdp-day_range_end {
             background-color: var(--rdp-accent-color) !important;
             color: white !important;
        }
        .rdp-day_range_middle {
            background-color: var(--rdp-background-color) !important;
            color: var(--rdp-accent-color) !important;
            border-radius: 0 !important;
        }
        .rdp-button:hover {
             background-color: var(--rdp-background-color) !important;
        }
        .rdp-caption_label {
             font-weight: bold !important;
             color: var(--rdp-accent-color);
        }
        .rdp-nav_button {
            border-radius: 0.5rem;
        }
        .rdp-nav_button:hover {
             background-color: var(--rdp-background-color) !important;
        }
      `}</style>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        <motion.div
          variants={itemVariants}
          className="flex justify-between items-center"
        >
          <h1 className="text-4xl font-bold text-gray-800">Analytics</h1>
          <div className="flex items-center gap-3 p-2 bg-white rounded-xl shadow-sm">
            <FilterButton value="today" label="Today" />
            <FilterButton value="last7days" label="Last 7 Days" />
            <FilterButton value="monthly" label="This Year" />
            
            {/* --- Updated Custom Range Button (UPDATED) --- */}
            <button
              onClick={() => {
                  // *** FIX: Jab modal khule, to temporary state ko 'applied' state se sync karein ***
                  setDateRange(appliedDateRange); 
                  setShowCalendarModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                (filter === 'custom')
                  ? "bg-[#0D3A25] text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Calendar size={18} />
              <span className="text-sm font-semibold">
                {/* Text logic ab 'appliedDateRange' par based hai */}
                {filter === 'custom' && appliedDateRange.from && appliedDateRange.to ? 
                  `${format(appliedDateRange.from, 'dd/MM')} - ${format(appliedDateRange.to, 'dd/MM')}` 
                  : "Custom Range"}
              </span>
            </button>
            {/* --- End Updated Button --- */}

          </div>
        </motion.div>
        <AnimatePresence>
          {/* Ab yeh 'data' ke empty hone par show hoga */}
          {(!isLoading && !data) && (
            <motion.div
              variants={itemVariants}
              className="flex flex-col items-center text-center text-gray-500 py-10 bg-white rounded-2xl shadow-lg"
            >
              <AlertTriangle size={48} className="text-red-400 mb-4" />
              <h3 className="text-xl font-bold">Data could not be loaded.</h3>
              <p>
                {filter === 'custom'
                  ? "Please select a valid custom date range and click 'Apply Range'."
                  : "Please check your API connection or try again later."
                }
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && data && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
              <StatCard
                icon={DollarSign}
                title="Revenue (Period)"
                value={`${data.totalRevenue.toLocaleString()}/-`}
              />
              <StatCard
                icon={Activity}
                title="Profit (Period)"
                value={`${data.totalProfit.toLocaleString()}/-`}
              />
              <StatCard
                icon={ShoppingCart}
                title="Sales (Period)"
                value={data.totalSales}
              />
              <StatCard
                icon={TrendingUp}
                title="Avg. Sale Value"
                value={`${Math.round(data.avgSaleValue).toLocaleString()}/-`}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <motion.div
                variants={itemVariants}
                className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  {data.chartLabel}
                </h2>
                <div style={{ width: "100%", height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.8)",
                          backdropFilter: "blur(5px)",
                          borderRadius: "10px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="total"
                        fill="#0D3A25"
                        name="Total Sale"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="profit"
                        fill="#22c55e"
                        name="Profit"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="bg-white p-8 rounded-2xl shadow-lg flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Profit Analysis
                  </h2>
                  <div className="text-center my-6">
                    <p className="text-gray-500">Total Profit ({filter})</p>
                    <p className="text-5xl font-bold text-green-600 mt-2">
                      {data.totalProfit.toLocaleString()}/-
                    </p>
                  </div>
                </div>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer>
                    <AreaChart
                      data={data.chartData}
                      margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorProfit"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#16a34a"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#16a34a"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Tooltip contentStyle={{ display: "none" }} />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#16a34a"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorProfit)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8"
            >
              <motion.div
                variants={itemVariants}
                className="bg-white p-6 rounded-2xl shadow-lg"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Top Selling Products ({filter.replace("last7days", "7 Days")})
                </h2>
                <ul className="space-y-4">
                  {data.topSellingProducts.length > 0 ? (
                    data.topSellingProducts.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="bg-[#0D3A25] text-white rounded-full h-8 w-8 flex items-center justify-center font-bold">
                            {i + 1}
                          </div>
                          <p className="font-semibold">{p.name}</p>
                        </div>
                        <p className="font-bold text-lg text-[#0D3A25]">
                          {p.totalSold} pcs
                        </p>
                      </li>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No products sold in this period.
                    </p>
                  )}
                </ul>
              </motion.div>
              <motion.div
                variants={itemVariants}
                className="bg-white p-6 rounded-2xl shadow-lg"
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Recent Sales
                </h2>
                <ul className="space-y-3">
                  {data.recentSales.map((sale) => (
                    <li
                      key={sale._id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {sale.customerName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Inv #{String(sale.invoiceNumber).padStart(4, "0")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg text-gray-800">
                            {sale.subTotal.toFixed(0)}/-
                          </p>
                          <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                            <Clock size={12} />
                            {new Date(sale.invoiceDate).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setPopup({ type: "view_invoice", data: sale })
                          }
                          title="View Invoice"
                          className="cursor-pointer text-gray-400 hover:text-[#0D3A25] transition-colors"
                        >
                          <FileText size={20} />
                        </button>
                        <button
                          onClick={() => handleSaveAsPdf(sale)}
                          title="Save as PDF"
                          className="cursor-pointer text-gray-400 hover:text-[#0D3A25] transition-colors"
                        >
                          <Save size={20} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}