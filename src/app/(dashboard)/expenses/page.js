"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    DollarSign, MinusCircle, Tag, Clock, Search, Edit2, 
    Trash2, Plus, X, AlertTriangle, Calendar, ChevronDown 
} from 'lucide-react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import Loader from '@/components/Loader';

// --- Reusable Components (Following Project Style) ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };
const Modal = ({ children, onCancel, size = 'md' }) => ( 
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"> 
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className={`bg-white rounded-2xl shadow-xl w-full max-w-${size} relative`}> 
            <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-20 cursor-pointer"><X size={24} /></button> 
            <div className="p-8 overflow-y-auto max-h-[90vh]">{children}</div> 
        </motion.div> 
    </motion.div> 
);
const ConfirmationPopup = ({ message, onConfirm, onCancel }) => ( 
    <Modal onCancel={onCancel} size="sm"> 
        <div className="text-center"> 
            <AlertTriangle className="mx-auto text-yellow-500" size={48} /> 
            <h3 className="text-xl font-bold mt-4 mb-2 text-gray-800">Confirm Action</h3> 
            <p className="my-4 text-md text-gray-600">{message}</p> 
            <div className="flex justify-center gap-4 mt-6"> 
                <button onClick={onCancel} className="py-2 px-6 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 cursor-pointer">Cancel</button> 
                <button onClick={onConfirm} className="py-2 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 cursor-pointer">Confirm</button> 
            </div> 
        </div> 
    </Modal> 
);
const StatCard = ({ icon: Icon, title, value }) => ( 
    <motion.div variants={itemVariants} className="flex items-center p-5 rounded-2xl text-white relative overflow-hidden" style={{ backgroundColor: '#0D3A25' }}> 
        <div className="absolute -bottom-1 -right-1 w-24 h-24 bg-white/5 rounded-full"></div> 
        <div className="p-3 bg-white/20 rounded-full mr-4"><Icon size={24} /></div> 
        <div> 
            <h3 className="text-md font-light">{title}</h3> 
            <p className="text-2xl lg:text-3xl font-bold">{value}</p> 
        </div> 
    </motion.div> 
);
// Updated FilterButton to accept onClick prop for flexibility
const FilterButton = ({ value, label, currentFilter, setFilter, onClick }) => (
    <button
      onClick={onClick || (() => setFilter(value))}
      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 cursor-pointer whitespace-nowrap ${
        currentFilter === value
          ? "bg-[#0D3A25] text-white shadow-md"
          : "bg-white text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
);

// --- CustomDropdown with Search/Suggestion ---
const CustomDropdown = ({ options, selected, onSelect, label, containerClassName = "w-48", buttonClassName = "bg-white", onDeleteCategory, isExpenseCategory = false }) => { 
    const [isOpen, setIsOpen] = useState(false); 
    const [filterText, setFilterText] = useState('');
    const dropdownRef = useRef(null); 

    const filteredOptions = options.filter(option => 
        option.toLowerCase().includes(filterText.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setFilterText('');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return ( 
        <div className={`relative ${containerClassName}`} ref={dropdownRef}> 
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D3A25] cursor-pointer ${buttonClassName}`}> 
                <span className="font-semibold text-gray-700">{selected === 'All' && label ? label : selected}</span> 
                <ChevronDown size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} /> 
            </button> 
            <AnimatePresence>
                {isOpen && ( 
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: -10 }} 
                        className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                        {options.length > 5 && (
                             <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                                <input
                                    type="text"
                                    placeholder="Search category..."
                                    className="w-full p-2 text-sm bg-gray-50 rounded-md outline-none"
                                    value={filterText}
                                    onChange={(e) => setFilterText(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}
                        {filteredOptions.length > 0 ? filteredOptions.map(option => ( 
                            <div 
                                key={option} 
                                onClick={() => { onSelect(option); setIsOpen(false); setFilterText(''); }} 
                                className={`flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-gray-100 ${selected === option ? 'bg-[#0D3A25] text-white' : 'text-gray-700'}`}
                            > 
                                <span>{option}</span> 
                                {onDeleteCategory && option !== 'All' && isExpenseCategory && (
                                    <Trash2 
                                        size={16} 
                                        className="text-red-400 hover:text-red-600" 
                                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); setFilterText(''); onDeleteCategory(option); }}
                                    />
                                )} 
                            </div> 
                        )) : (
                            <p className="text-center text-gray-500 py-2">No results found</p>
                        )} 
                    </motion.div> 
                )} 
            </AnimatePresence> 
        </div> 
    ); 
};

// --- Expense Popups ---
const AddEditExpensePopup = ({ categories, onSave, onCancel, initialData = null, defaultCategory }) => {
    const isEditing = !!initialData;
    const initialCategory = isEditing 
        ? initialData.category 
        : (defaultCategory !== 'All' && defaultCategory) || categories.filter(c => c !== 'All')[0] || 'Others';

    const [expense, setExpense] = useState(initialData || { name: '', amount: '', category: initialCategory, note: '', date: new Date() });
    const [showCalendar, setShowCalendar] = useState(false);
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');

    useEffect(() => {
        setExpense(prev => ({ ...prev, amount: parseFloat(amount) || 0 }));
    }, [amount]);
    
    const handleChange = (e) => setExpense({ ...expense, [e.target.name]: e.target.value });

    const handleSave = () => {
        if (!expense.name || !amount || !expense.category) {
            alert("Please fill all required fields.");
            return;
        }
        onSave(expense);
    };

    return (
        <Modal onCancel={onCancel} size="md">
            <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">{isEditing ? 'Edit Expense' : 'Record New Expense'}</h3>
            <div className="space-y-4">
                <input type="text" name="name" value={expense.name} onChange={handleChange} placeholder="Expense Name (e.g., Rent)" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
                <input type="number" name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (in Rupees)" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
                <CustomDropdown 
                    options={categories.filter(c => c !== 'All')} 
                    selected={expense.category} 
                    onSelect={(cat) => setExpense({...expense, category: cat})} 
                    label="Select Category" 
                    containerClassName="w-full" 
                    buttonClassName="bg-gray-100"
                />
                <input type="text" name="note" value={expense.note} onChange={handleChange} placeholder="Notes (Optional)" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/>
                <div className="relative">
                    <input type="text" readOnly value={expense.date ? format(new Date(expense.date), 'dd MMM, yyyy') : ''} onClick={() => setShowCalendar(!showCalendar)} className="w-full p-3 bg-gray-100 rounded-xl outline-none cursor-pointer focus:scale-105 transition-transform duration-300 shadow-inner"/>
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                </div>
            </div>
            <div className="flex justify-end mt-8">
                <button onClick={handleSave} className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 cursor-pointer">
                    {isEditing ? 'Save Changes' : 'Record Expense'}
                </button>
            </div>
            {showCalendar && (<motion.div initial={{opacity: 0}} animate={{opacity:1}} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white p-2 rounded-lg shadow-2xl border"><DayPicker mode="single" selected={new Date(expense.date)} onSelect={(date) => { if (date) { setExpense({...expense, date}); } setShowCalendar(false); }}/></motion.div>)}
        </Modal>
    );
};

const AddCategoryPopup = ({ onSave, onCancel }) => { 
    const [name, setName] = useState(''); 
    return ( 
        <Modal onCancel={onCancel} size="sm"> 
            <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Add New Category</h3> 
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category Name (e.g., Utility Bills)" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/> 
            <div className="flex justify-end mt-6"> 
                <button onClick={() => onSave(name)} className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 transition-transform cursor-pointer">Save Category</button> 
            </div> 
        </Modal> 
    ); 
};

const ExpenseRow = ({ expense, onEdit, onDelete }) => (
    <motion.div 
        variants={itemVariants} 
        className="flex flex-col md:flex-row items-start md:items-center p-4 rounded-xl text-white transition-transform transform hover:scale-[1.01] shadow-md"
        style={{ backgroundColor: '#0D3A25' }}
    >
        <div className="flex-grow mb-2 md:mb-0">
            <p className="font-semibold">{expense.name}</p>
            <p className="text-xs text-gray-300 flex items-center gap-1 mt-1">
                <Tag size={12}/>{expense.category}
            </p>
            {expense.note && <p className="text-xs italic text-gray-400 mt-1 block md:hidden">Note: {expense.note}</p>}
        </div>
        <div className="flex justify-between w-full md:w-auto md:gap-0">
            <span className="w-32 text-left md:text-center text-lg font-bold">
                {expense.amount.toLocaleString()}/-
            </span>
            <span className="w-32 text-right md:text-center text-sm">
                <p className="flex items-center justify-end md:justify-center gap-1 text-gray-200">
                    <Calendar size={12}/>{format(new Date(expense.date), 'dd MMM, yyyy')}
                </p>
            </span>
        </div>
        <div className="w-40 flex justify-end md:justify-center gap-4 mt-3 md:mt-0">
            <button onClick={() => onEdit(expense)} title="Edit" className="cursor-pointer transition-transform hover:scale-125 hover:text-yellow-300">
                <Edit2 size={18} />
            </button>
            <button onClick={() => onDelete(expense._id)} title="Delete" className="cursor-pointer transition-transform hover:scale-125 hover:text-red-400">
                <Trash2 size={18} />
            </button>
        </div>
    </motion.div>
);

// --- Main Page Component ---
export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState(['All']);
    const [totalExpense, setTotalExpense] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [dateFilter, setDateFilter] = useState('monthly'); 
    const [popup, setPopup] = useState({ type: null, data: null });

    // --- Calendar States ---
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [dateRange, setDateRange] = useState({ from: undefined, to: undefined }); // Temporary range
    const [appliedDateRange, setAppliedDateRange] = useState({ from: undefined, to: undefined }); // Confirmed range

    const fetchData = async () => {
        // Agar filter 'custom' hai lekin range complete nahi hui, to fetch mat karo
        if (dateFilter === 'custom' && (!appliedDateRange.from || !appliedDateRange.to)) {
             return;
        }

        setIsLoading(true);
        try {
            let url = `/api/expenses?filter=${dateFilter}`;
            // Custom range ke liye URL mein dates add karein
            if (dateFilter === 'custom' && appliedDateRange.from && appliedDateRange.to) {
                url += `&from=${appliedDateRange.from.toISOString().split('T')[0]}&to=${appliedDateRange.to.toISOString().split('T')[0]}`;
            }
            
            const cacheBuster = `_=${new Date().getTime()}`;
            const [expRes, catRes] = await Promise.all([
                fetch(`${url}&${cacheBuster}`),
                fetch(`/api/expense-categories?${cacheBuster}`)
            ]);

            const expData = await expRes.json();
            const catData = await catRes.json();

            setExpenses(Array.isArray(expData.expenses) ? expData.expenses : []);
            setTotalExpense(expData.totalAmount || 0);
            setCategories(['All', ...(Array.isArray(catData) ? catData.map(c => c.name) : [])]);

        } catch (error) {
            console.error("Failed to fetch expenses data:", error);
            setExpenses([]);
            setTotalExpense(0);
        } finally {
            setIsLoading(false);
        }
    };

    // Dependency array mein appliedDateRange add kiya
    useEffect(() => {
        fetchData();
    }, [dateFilter, appliedDateRange]);

    // --- Handlers ---
    const handleSaveExpense = async (expenseData) => {
        const url = expenseData._id ? `/api/expenses/${expenseData._id}` : '/api/expenses';
        const method = expenseData._id ? 'PUT' : 'POST';
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expenseData) });
        setPopup({ type: null }); fetchData();
    };
    const handleDeleteExpense = async () => {
        if (popup.type === 'deleteExpense' && popup.data) { await fetch(`/api/expenses/${popup.data}`, { method: 'DELETE' }); setPopup({ type: null }); fetchData(); }
    };
    const handleAddCategory = async (name) => {
        if (!name) return;
        const res = await fetch('/api/expense-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }), });
        if (res.ok) { setPopup({ type: null }); fetchData(); } else { const errorData = await res.json(); setPopup({ type: 'alert', data: errorData.error || 'Failed to add category.' }); }
    };
    const handleDeleteCategory = (categoryName) => setPopup({ type: 'deleteCategory', data: categoryName });
    const confirmDeleteCategory = async () => {
        if (popup.type === 'deleteCategory' && popup.data) {
             const res = await fetch(`/api/expense-categories/${encodeURIComponent(popup.data)}`, { method: 'DELETE' });
             if (res.ok) { setSelectedCategory('All'); setPopup({ type: null }); fetchData(); } 
             else { const errorData = await res.json(); setPopup({ type: 'alert', data: errorData.error || 'Failed to delete category.' }); }
        }
    };

    // --- Calendar Handlers ---
    const handleDateSelect = (range) => setDateRange(range); // Sirf temporary state update
    const handleApplyRange = () => {
        if (dateRange.from && dateRange.to) {
            setAppliedDateRange(dateRange); // Apply range
            setDateFilter('custom');       // Set filter to custom
            setShowCalendarModal(false);   // Close modal
        } else {
            alert("Please select a complete date range.");
        }
    };
    const handleStandardFilterClick = (value) => {
        setDateFilter(value);
        setDateRange({ from: undefined, to: undefined });
        setAppliedDateRange({ from: undefined, to: undefined });
    };


    const filteredExpenses = expenses.filter(exp => {
        const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
        const matchesSearch = exp.name.toLowerCase().includes(searchTerm.toLowerCase()) || exp.note.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });
    
    const topCategory = filteredExpenses.reduce((acc, exp) => { acc[exp.category] = (acc[exp.category] || 0) + exp.amount; return acc; }, {});
    const sortedCategories = Object.entries(topCategory).sort(([, a], [, b]) => b - a);
    const topCategoryName = sortedCategories[0]?.[0] || 'N/A';
    const topCategoryAmount = sortedCategories[0]?.[1] || 0;
    const totalCategories = categories.length - 1;

    if (isLoading) return <Loader />;

    return (
        <>
            <AnimatePresence>
                {popup.type === 'addEditExpense' && <AddEditExpensePopup categories={categories} onSave={handleSaveExpense} onCancel={() => setPopup({ type: null })} initialData={popup.data} defaultCategory={selectedCategory} />}
                {popup.type === 'addCategory' && <AddCategoryPopup onSave={handleAddCategory} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'deleteExpense' && <ConfirmationPopup message="Are you sure you want to delete this expense?" onConfirm={handleDeleteExpense} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'deleteCategory' && <ConfirmationPopup message={`Are you sure you want to delete the "${popup.data}" category?`} onConfirm={confirmDeleteCategory} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'alert' && <Modal onCancel={() => setPopup({ type: null })} size="sm"> <div className="text-center"> <AlertTriangle className="mx-auto text-blue-500" size={48} /> <h3 className="text-xl font-bold mt-4 mb-2 text-gray-800">Information</h3> <p className="my-4 text-md text-gray-600">{popup.data}</p> <div className="flex justify-center mt-6"> <button onClick={() => setPopup({ type: null })} className="py-2 px-8 bg-[#0D3A25] text-white rounded-lg font-semibold hover:opacity-90 transition-colors cursor-pointer">OK</button> </div> </div> </Modal>}
            
                {/* --- Calendar Modal --- */}
                {showCalendarModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowCalendarModal(false); setDateRange(appliedDateRange); if (dateFilter === 'custom' && (!appliedDateRange.from || !appliedDateRange.to)) setDateFilter('monthly'); }} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl p-4 relative">
                            <button onClick={() => { setShowCalendarModal(false); setDateRange(appliedDateRange); if (dateFilter === 'custom' && (!appliedDateRange.from || !appliedDateRange.to)) setDateFilter('monthly'); }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors z-10"><X size={20} /></button>
                            <DayPicker mode="range" selected={dateRange} onSelect={handleDateSelect} numberOfMonths={2} defaultMonth={dateRange.from || new Date()} captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 1} />
                            <div className="flex justify-end p-2 border-t border-gray-200 mt-2">
                                <button onClick={handleApplyRange} disabled={!dateRange.from || !dateRange.to} className="px-6 py-2 bg-[#0D3A25] text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-opacity-90">Apply Range</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Calendar CSS Styling */}
            <style jsx global>{` .rdp { --rdp-cell-size: 44px; --rdp-caption-font-size: 1.1rem; --rdp-accent-color: #0D3A25; --rdp-background-color: #f0fdf4; margin: 1em; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 1rem; box-shadow: 0 4px 15px rgba(0,0,0,0.05); } .rdp-day_selected, .rdp-day_selected:hover { background-color: var(--rdp-accent-color) !important; color: white !important; } .rdp-day_range_start, .rdp-day_range_end { background-color: var(--rdp-accent-color) !important; color: white !important; } .rdp-day_range_middle { background-color: var(--rdp-background-color) !important; color: var(--rdp-accent-color) !important; border-radius: 0 !important; } .rdp-button:hover { background-color: var(--rdp-background-color) !important; } .rdp-caption_label { font-weight: bold !important; color: var(--rdp-accent-color); } .rdp-nav_button { border-radius: 0.5rem; } .rdp-nav_button:hover { background-color: var(--rdp-background-color) !important; } `}</style>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 max-w-7xl mx-auto">
                <motion.div variants={itemVariants}>
                    <h1 className="text-4xl font-bold text-gray-800">Expenses</h1>
                    <p className="text-gray-500 mt-1">Record and manage all business expenditures.</p>
                </motion.div>

                <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard icon={DollarSign} title={`Total Expense (${dateFilter === 'custom' ? 'Custom' : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)})`} value={`${totalExpense.toLocaleString()}/-`} />
                    <StatCard icon={Tag} title="Top Spending Category" value={`${topCategoryName} (${topCategoryAmount.toLocaleString()}/-)`} />
                    <StatCard icon={MinusCircle} title="Total Categories" value={totalCategories} />
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-end w-full">
                    <button onClick={() => setPopup({type: 'addCategory', data: null})} className="flex items-center justify-center flex-1 sm:flex-none gap-2 text-white font-semibold py-2.5 px-6 rounded-xl bg-[#0D3A25] transition-transform transform hover:scale-105 cursor-pointer whitespace-nowrap shadow-lg">
                        <Tag size={18}/> Add Category
                    </button>
                    <button onClick={() => setPopup({type: 'addEditExpense', data: null})} className="flex items-center justify-center flex-1 sm:flex-none gap-2 text-white font-semibold py-2.5 px-6 rounded-xl bg-[#0D3A25] transition-transform transform hover:scale-105 cursor-pointer whitespace-nowrap shadow-lg">
                        <Plus size={18}/> New Expense
                    </button>
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-5 gap-4">
                         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
                             <div className="relative w-full sm:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="text" placeholder="Search by Name or Notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 w-full py-3 bg-white rounded-lg border-gray-200 outline-none focus:ring-2 focus:ring-transparent focus:border-[#0D3A25] transition-transform duration-300" />
                            </div>
                            <CustomDropdown label="Category" options={categories} selected={selectedCategory} onSelect={setSelectedCategory} onDeleteCategory={handleDeleteCategory} isExpenseCategory={true} containerClassName="w-full sm:w-48" buttonClassName="bg-white" />
                        </div>
                        
                        {/* --- Updated Filter Buttons with Custom Range --- */}
                        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl w-full lg:w-auto overflow-x-auto flex-shrink-0 mt-2 sm:mt-0">
                            <FilterButton value="daily" label="Today" currentFilter={dateFilter} setFilter={setDateFilter} onClick={() => handleStandardFilterClick('daily')} />
                            <FilterButton value="monthly" label="Month" currentFilter={dateFilter} setFilter={setDateFilter} onClick={() => handleStandardFilterClick('monthly')} />
                            <FilterButton value="yearly" label="Year" currentFilter={dateFilter} setFilter={setDateFilter} onClick={() => handleStandardFilterClick('yearly')} />
                            <FilterButton value="all" label="All Time" currentFilter={dateFilter} setFilter={setDateFilter} onClick={() => handleStandardFilterClick('all')} />
                            
                            {/* Custom Range Button */}
                             <button onClick={() => { setDateRange(appliedDateRange); setShowCalendarModal(true); }} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 cursor-pointer whitespace-nowrap ${dateFilter === 'custom' ? "bg-[#0D3A25] text-white shadow-md" : "bg-white text-gray-700 hover:bg-gray-100"}`}>
                                <Calendar size={16} />
                                <span>{dateFilter === 'custom' && appliedDateRange.from && appliedDateRange.to ? `${format(appliedDateRange.from, 'dd/MM')} - ${format(appliedDateRange.to, 'dd/MM')}` : "Custom"}</span>
                            </button>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center px-4 py-2 text-sm text-gray-500 font-medium border-b border-gray-200">
                        <span className="flex-grow">Expense Details</span>
                        <span className="w-32 text-center">Amount</span>
                        <span className="w-32 text-center">Date</span>
                        <span className="w-40 text-center">Actions</span>
                    </div>

                    <motion.div variants={containerVariants} className="space-y-3 mt-4">
                        {filteredExpenses.length > 0 ? (
                            filteredExpenses.map((expense) => (
                                <ExpenseRow key={expense._id} expense={expense} onEdit={(exp) => setPopup({type: 'addEditExpense', data: exp})} onDelete={(id) => setPopup({type: 'deleteExpense', data: id})} />
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-10">No expenses found for this period.</p>
                        )}
                    </motion.div>
                </motion.div>
            </motion.div>
        </>
    );
}