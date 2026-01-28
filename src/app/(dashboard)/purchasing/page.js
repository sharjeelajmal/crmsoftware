"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Truck, DollarSign, Plus, X, AlertTriangle, Search, Edit2, Trash2, Calendar, ChevronDown, User, Phone } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import Loader from '@/components/Loader';

// --- Reusable Components ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };
const Modal = ({ children, onCancel, size = 'md' }) => ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"> <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`bg-white rounded-2xl shadow-xl w-full max-w-${size} relative`}> <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-20 cursor-pointer"><X size={24} /></button> <div className="p-8">{children}</div> </motion.div> </motion.div> );
const ConfirmationPopup = ({ message, onConfirm, onCancel }) => ( <Modal onCancel={onCancel} size="sm"> <div className="text-center"> <AlertTriangle className="mx-auto text-yellow-500" size={48} /> <h3 className="text-xl font-bold mt-4 mb-2">Are you sure?</h3> <p className="my-4 text-md text-gray-600">{message}</p> <div className="flex justify-center gap-4 mt-6"> <button onClick={onCancel} className="py-2 px-6 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 cursor-pointer">Cancel</button> <button onClick={onConfirm} className="py-2 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 cursor-pointer">Confirm</button> </div> </div> </Modal> );
const StatCard = ({ icon: Icon, title, value }) => ( <motion.div variants={itemVariants} className="flex items-center p-5 rounded-2xl text-white relative overflow-hidden" style={{ backgroundColor: '#0D3A25' }}> <div className="absolute -bottom-1 -right-1 w-24 h-24 bg-white/5 rounded-full"></div> <div className="p-3 bg-white/20 rounded-full mr-4"><Icon size={24} /></div> <div> <h3 className="text-md font-light">{title}</h3> <p className="text-2xl lg:text-3xl font-bold">{value}</p> </div> </motion.div> );
const CustomDropdown = ({ options, selected, onSelect, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(opt => opt.value === selected);
    return (
        <div className="relative w-full">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-xl outline-none cursor-pointer"><span className={selected ? 'text-gray-800' : 'text-gray-400'}>{selectedOption?.label || placeholder}</span><ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} /></button>
            <AnimatePresence>{isOpen && (<motion.ul initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">{options.map(option => (<li key={option.value} onClick={() => { onSelect(option.value); setIsOpen(false); }} className="px-4 py-2 cursor-pointer hover:bg-gray-100">{option.label}</li>))}</motion.ul>)}</AnimatePresence>
        </div>
    );
};
// --- *** NEW: Auto-Suggestion Input Component *** ---
const ProductSuggestionInput = ({ products, onSelect, value, onChange }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);

    const handleInputChange = (e) => {
        const query = e.target.value;
        onChange(query);
        if (query.length > 0) {
            setSuggestions(
                products.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
            );
            setIsOpen(true);
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    };

    const handleSelect = (product) => {
        onSelect(product);
        setIsOpen(false);
        setSuggestions([]);
    };
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (inputRef.current && !inputRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <div className="relative w-full" ref={inputRef}>
            <input 
                type="text" 
                value={value}
                onChange={handleInputChange}
                onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
                placeholder="Type to search for a product..." 
                className="w-full p-3 bg-gray-100 rounded-xl outline-none"
            />
            <AnimatePresence>
                {isOpen && suggestions.length > 0 && (
                    <motion.ul 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }} 
                        className="absolute z-10 w-full mt-2 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                        {suggestions.map(product => (
                            <li 
                                key={product._id} 
                                onClick={() => handleSelect(product)} 
                                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            >
                                {product.name}
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};


// --- Popups ---
const AddPurchasePopup = ({ products, vendors, onSave, onCancel }) => {
    const [purchase, setPurchase] = useState({ productId: '', vendorId: '', quantity: '', costPerItem: '', purchaseDate: new Date() });
    const [productName, setProductName] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    
    const handleChange = (e) => setPurchase({ ...purchase, [e.target.name]: e.target.value });
    
    const handleProductSelect = (product) => {
        setPurchase({ ...purchase, productId: product._id, costPerItem: product.purchasePrice || '' });
        setProductName(product.name);
    };

    const vendorOptions = vendors.map(v => ({ value: v._id, label: v.name }));
    
    return (
        <Modal onCancel={onCancel} size="lg">
            <h3 className="text-2xl font-bold mb-6 text-center">Record New Purchase</h3>
            <div className="space-y-4">
                <ProductSuggestionInput 
                    products={products}
                    value={productName}
                    onChange={setProductName}
                    onSelect={handleProductSelect}
                />
                <CustomDropdown options={vendorOptions} selected={purchase.vendorId} onSelect={(val) => setPurchase({...purchase, vendorId: val})} placeholder="Select Vendor" />
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" name="quantity" value={purchase.quantity} onChange={handleChange} placeholder="Quantity" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
                    <input type="number" name="costPerItem" value={purchase.costPerItem} onChange={handleChange} placeholder="Cost per Item" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
                </div>
                <div className="relative"><input type="text" readOnly value={purchase.purchaseDate ? format(purchase.purchaseDate, 'dd MMM, yyyy') : ''} onClick={() => setShowCalendar(!showCalendar)} className="w-full p-3 bg-gray-100 rounded-xl outline-none cursor-pointer focus:scale-105 transition-transform duration-300 shadow-inner"/><Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/></div>
            </div>
            <div className="flex justify-end mt-8"><button onClick={() => onSave(purchase)} className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 cursor-pointer">Record Purchase</button></div>
            {showCalendar && (<motion.div initial={{opacity: 0}} animate={{opacity:1}} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white p-2 rounded-lg shadow-2xl border"><DayPicker mode="single" selected={purchase.purchaseDate} onSelect={(date) => { if (date) { setPurchase({...purchase, purchaseDate: date}); } setShowCalendar(false); }}/></motion.div>)}
        </Modal>
    );
};
const VendorPopup = ({ onSave, onCancel, initialData }) => {
    const [vendor, setVendor] = useState(initialData || { name: '', contactPerson: '', phone: '' });
    const isEditing = !!initialData;
    const handleChange = (e) => setVendor({ ...vendor, [e.target.name]: e.target.value });
    return (
        <Modal onCancel={onCancel} size="md">
            <h3 className="text-2xl font-bold mb-6 text-center">{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</h3>
            <div className="space-y-4">
                <input type="text" name="name" value={vendor.name} onChange={handleChange} placeholder="Vendor Company Name" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
                <input type="text" name="contactPerson" value={vendor.contactPerson} onChange={handleChange} placeholder="Contact Person" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
                <input type="tel" name="phone" value={vendor.phone} onChange={handleChange} placeholder="Phone Number" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
            </div>
            <div className="flex justify-end mt-8"><button onClick={() => onSave(vendor)} className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 cursor-pointer">{isEditing ? 'Save Changes' : 'Save Vendor'}</button></div>
        </Modal>
    );
};

// --- *** NEW: Date Filter Button Component *** ---
const FilterButton = ({ value, label, currentFilter, setFilter }) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 cursor-pointer ${
        currentFilter === value
          ? "bg-white text-[#0D3A25] shadow-md"
          : "bg-transparent text-gray-600 hover:bg-white/50"
      }`}
    >
      {label}
    </button>
);

// --- Main Page Component ---
export default function PurchasingPage() {
    const [purchases, setPurchases] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [popup, setPopup] = useState({ type: null, data: null });
    const [view, setView] = useState('purchases');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('daily'); // 'all', 'daily', 'monthly', 'yearly'

    const fetchData = async () => { 
        setIsLoading(true); 
        try { 
            const [purRes, venRes, prodRes] = await Promise.all([ 
                fetch(`/api/purchases?filter=${dateFilter}`), // Pass filter to API
                fetch('/api/vendors'), 
                fetch('/api/products') 
            ]); 
            const purData = await purRes.json(); setPurchases(Array.isArray(purData) ? purData : []); 
            const venData = await venRes.json(); setVendors(Array.isArray(venData) ? venData : []); 
            const prodData = await prodRes.json(); setProducts(Array.isArray(prodData) ? prodData : []); 
        } catch (error) { 
            console.error("Failed to fetch data:", error); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => { 
        fetchData(); 
    }, [dateFilter]); // Refetch data when dateFilter changes

    const handleSavePurchase = async (purchase) => { if (!purchase.productId || !purchase.vendorId || !purchase.quantity || !purchase.costPerItem) return alert('Please fill all fields'); await fetch('/api/purchases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(purchase) }); setPopup({ type: null }); fetchData(); };
    const handleSaveVendor = async (vendor) => { const url = vendor._id ? `/api/vendors/${vendor._id}` : '/api/vendors'; const method = vendor._id ? 'PUT' : 'POST'; await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(vendor) }); setPopup({ type: null }); fetchData(); };
    const confirmDeleteVendor = async () => { await fetch(`/api/vendors/${popup.data}`, { method: 'DELETE' }); setPopup({ type: null }); fetchData(); };
    
    // --- *** NEW: Purchase Deletion Logic *** ---
    const confirmDeletePurchase = async () => {
        if (popup.type === 'deletePurchase' && popup.data) {
            await fetch(`/api/purchases/${popup.data}`, { method: 'DELETE' });
            setPopup({ type: null });
            fetchData(); // Refresh data from server
        }
    };

    // --- *** MODIFIED: Calculations now depend on the filtered 'purchases' state *** ---
    const totalPurchaseValue = purchases.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    const activeVendorIds = new Set(purchases.map(p => p.vendorId));
    const activeVendorsCount = activeVendorIds.size;
    const recentPurchase = purchases.length > 0 ? products.find(p => p._id === purchases[0].productId)?.name : 'N/A';
    
    // Search Logic (remains the same)
    const filteredPurchases = purchases.filter(p => {
        const product = products.find(prod => prod._id === p.productId);
        return product?.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
    const filteredVendors = vendors.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <Loader />;

    return (
        <>
            <AnimatePresence>
                {popup.type === 'addPurchase' && <AddPurchasePopup products={products} vendors={vendors} onSave={handleSavePurchase} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'vendor' && <VendorPopup onSave={handleSaveVendor} onCancel={() => setPopup({ type: null })} initialData={popup.data} />}
                {popup.type === 'deleteVendor' && <ConfirmationPopup message="Are you sure you want to delete this vendor?" onConfirm={confirmDeleteVendor} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'deletePurchase' && <ConfirmationPopup message="This will also add the stock back to inventory. Are you sure?" onConfirm={confirmDeletePurchase} onCancel={() => setPopup({ type: null })} />}
            </AnimatePresence>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 max-w-7xl mx-auto">
                <motion.div variants={itemVariants}><h1 className="text-4xl font-bold text-gray-800">Purchasing</h1><p className="text-gray-500 mt-1">Manage your inventory purchases and vendors.</p></motion.div>
                
                {/* --- *** MODIFIED: StatCards now show filtered data *** --- */}
                <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard icon={DollarSign} title="Purchase Value (Period)" value={`${totalPurchaseValue.toLocaleString()}/-`} />
                    <StatCard icon={Truck} title="Active Vendors (Period)" value={activeVendorsCount} />
                    <StatCard icon={ShoppingBag} title="Most Recent Purchase (Period)" value={recentPurchase} />
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                            <button onClick={() => setView('purchases')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-300 cursor-pointer ${view === 'purchases' ? 'bg-white shadow text-[#0D3A25]' : 'text-gray-600'}`}>Purchase History</button>
                            <button onClick={() => setView('vendors')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-300 cursor-pointer ${view === 'vendors' ? 'bg-white shadow text-[#0D3A25]' : 'text-gray-600'}`}>Manage Vendors</button>
                        </div>
                        <div className="flex-grow flex justify-center">
                            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
                                <FilterButton value="daily" label="Daily" currentFilter={dateFilter} setFilter={setDateFilter} />
                                <FilterButton value="monthly" label="Monthly" currentFilter={dateFilter} setFilter={setDateFilter} />
                                <FilterButton value="yearly" label="Yearly" currentFilter={dateFilter} setFilter={setDateFilter} />
                                <FilterButton value="all" label="All Time" currentFilter={dateFilter} setFilter={setDateFilter} />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative w-full md:w-auto">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="text" placeholder={`Search ${view === 'purchases' ? 'product...' : 'vendor...'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 w-full md:w-56 py-3 bg-white rounded-lg border-gray-200 outline-none focus:ring-2 focus:ring-transparent focus:border-[#0D3A25] focus:scale-105 transition-transform duration-300" />
                            </div>
                            <button onClick={() => setPopup({type: view === 'purchases' ? 'addPurchase' : 'vendor', data: null})} className="flex items-center gap-2 text-white font-semibold py-2.5 px-6 rounded-lg bg-[#0D3A25] transition-transform transform hover:scale-105 cursor-pointer"><Plus size={16}/> {view === 'purchases' ? 'New Purchase' : 'Add Vendor'}</button>
                        </div>
                    </div>
                    <AnimatePresence mode="wait">
                        <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                             {view === 'purchases' ? <PurchaseHistoryView purchases={filteredPurchases} products={products} vendors={vendors} onDelete={(id) => setPopup({type: 'deletePurchase', data: id})} /> : <VendorManagementView vendors={filteredVendors} onEdit={(vendor) => setPopup({type: 'vendor', data: vendor})} onDelete={(id) => setPopup({type: 'deleteVendor', data: id})} />}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </>
    );
}

// --- Sub-Components ---
const PurchaseCard = ({ purchase, product, vendor, onDelete }) => (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300">
        <div>
            <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-bold text-gray-800">{product?.name || 'N/A'}</h3>
                <p className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">{purchase.totalCost.toLocaleString()}/-</p>
            </div>
            <p className="text-sm text-gray-500">From <span className="font-semibold text-gray-700">{vendor?.name || 'N/A'}</span></p>
        </div>
        <div className="border-t my-4"></div>
        <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
                <p><strong>Quantity:</strong> {purchase.quantity} pcs</p>
                <p><strong>Date:</strong> {format(new Date(purchase.purchaseDate), 'dd MMM, yyyy')}</p>
            </div>
            {/* --- *** NEW: Delete Button *** --- */}
            <button onClick={() => onDelete(purchase._id)} className="p-2 text-gray-400 hover:text-red-600 cursor-pointer" title="Delete Purchase">
                <Trash2 size={18} />
            </button>
        </div>
    </motion.div>
);
const VendorCard = ({ vendor, onEdit, onDelete }) => (
    <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-lg p-5 flex flex-col justify-between hover:shadow-xl transition-shadow duration-300 h-full">
        <div>
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-[#0D3A25]">{vendor.name.charAt(0)}</div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800">{vendor.name}</h3>
                    <p className="text-sm text-gray-500">{vendor.contactPerson}</p>
                </div>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14}/> {vendor.phone}</p>
        </div>
        <div className="border-t mt-4 pt-3 flex justify-end gap-3">
            <button onClick={() => onEdit(vendor)} className="p-2 text-gray-500 hover:text-blue-600 cursor-pointer"><Edit2 size={18} /></button>
            <button onClick={() => onDelete(vendor._id)} className="p-2 text-gray-500 hover:text-red-600 cursor-pointer"><Trash2 size={18} /></button>
        </div>
    </motion.div>
);

const PurchaseHistoryView = ({ purchases, products, vendors, onDelete }) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-fr">
        {purchases.length > 0 ? purchases.map(p => { 
            const product = products.find(prod => prod._id === p.productId); 
            const vendor = vendors.find(v => v._id === p.vendorId); 
            return (<PurchaseCard key={p._id} purchase={p} product={product} vendor={vendor} onDelete={onDelete} />); 
        }) : <p className="col-span-full text-center py-10 text-gray-500">No purchase records found.</p>}
    </motion.div>
);
const VendorManagementView = ({ vendors, onEdit, onDelete }) => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 auto-rows-fr">
        {vendors.length > 0 ? vendors.map(v => (
            <VendorCard key={v._id} vendor={v} onEdit={onEdit} onDelete={onDelete} />
        )) : <p className="col-span-full text-center py-10 text-gray-500">No vendors found.</p>}
    </motion.div>
);