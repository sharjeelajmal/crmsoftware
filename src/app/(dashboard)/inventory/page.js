"use client";
import Loader from '@/components/Loader';
import { useState,useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Trash2, Minus, X, AlertTriangle, ChevronDown } from 'lucide-react';

// --- Reusable Components (same as before) ---
const Modal = ({ children, onCancel }) => ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"> <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md relative"> <button onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"><X size={24} /></button> <div className="p-8">{children}</div> </motion.div> </motion.div> );
const ConfirmationPopup = ({ message, onConfirm, onCancel }) => ( <Modal onCancel={onCancel}> <div className="text-center"> <AlertTriangle className="mx-auto text-yellow-500" size={48} /> <h3 className="text-xl font-bold mt-4 mb-2 text-gray-800">Confirmation</h3> <p className="my-4 text-md text-gray-600">{message}</p> <div className="flex justify-center gap-4 mt-6"> <button onClick={onCancel} className="py-2 px-6 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors cursor-pointer">Cancel</button> <button onClick={onConfirm} className="py-2 px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors cursor-pointer">Confirm</button> </div> </div> </Modal> );
const AlertPopup = ({ message, onCancel }) => ( <Modal onCancel={onCancel}> <div className="text-center"> <AlertTriangle className="mx-auto text-blue-500" size={48} /> <h3 className="text-xl font-bold mt-4 mb-2 text-gray-800">Information</h3> <p className="my-4 text-md text-gray-600">{message}</p> <div className="flex justify-center mt-6"> <button onClick={onCancel} className="py-2 px-8 bg-[#0D3A25] text-white rounded-lg font-semibold hover:opacity-90 transition-colors cursor-pointer">OK</button> </div> </div> </Modal> );
const AddCategoryPopup = ({ onSave, onCancel }) => { const [name, setName] = useState(''); return ( <Modal onCancel={onCancel}> <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Add New Category</h3> <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Category Name" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/> <div className="flex justify-end mt-6"> <button onClick={() => onSave(name)} className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 transition-transform cursor-pointer">Save Category</button> </div> </Modal> ); };
const AddProductPopup = ({ categories, initialCategory, onSave, onCancel }) => { const [product, setProduct] = useState({ name: '', category: initialCategory, purchasePrice: '', salePrice: '', remaining: '' }); const handleChange = (e) => setProduct({...product, [e.target.name]: e.target.value }); return ( <Modal onCancel={onCancel}> <h3 className="text-2xl font-bold mb-6 text-center text-gray-800">Add New Product</h3> <div className="space-y-4"> <CustomDropdown options={categories} selected={product.category} onSelect={(cat) => setProduct({...product, category: cat})} label="Category" containerClassName="w-full" buttonClassName="bg-gray-100"/> <input type="text" name="name" value={product.name} onChange={handleChange} placeholder="Enter Name" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/> <div className="grid grid-cols-2 gap-4"><input type="number" name="purchasePrice" value={product.purchasePrice} onChange={handleChange} placeholder="Enter Purchase Price" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/><input type="number" name="salePrice" value={product.salePrice} onChange={handleChange} placeholder="Enter Sale Price" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/></div> <input type="number" name="remaining" value={product.remaining} onChange={handleChange} placeholder="Enter Quantity" className="w-full p-3 bg-gray-100 rounded-xl outline-none"/> </div> <div className="flex justify-end mt-8"> <button onClick={() => onSave(product)} className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 transition-transform cursor-pointer">Add Product</button> </div> </Modal> ); };
const StockUpdatePopup = ({ productName, action, onSave, onCancel }) => { const [quantity, setQuantity] = useState(1); return ( <Modal onCancel={onCancel}> <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">{action === 'add' ? 'Increase' : 'Decrease'} Stock</h3> <p className="mb-6 text-center text-gray-500">for {productName}</p> <input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-full p-3 text-center text-xl bg-gray-100 rounded-xl outline-none mb-6"/> <div className="flex justify-end"> <button onClick={() => onSave(quantity)} className="py-3 px-8 bg-[#0D3A25] text-white rounded-xl font-semibold transform hover:scale-105 transition-transform cursor-pointer">Update Stock</button> </div> </Modal> ); };
// --- UPDATED DROPDOWN with Search, Scroller, and Click-outside-to-close ---
const CustomDropdown = ({ options, selected, onSelect, label, containerClassName = "w-48", buttonClassName = "bg-white", onDeleteCategory }) => { 
    const [isOpen, setIsOpen] = useState(false); 
    const [filterText, setFilterText] = useState('');
    const dropdownRef = useRef(null); // Ref for click-outside

    // Filter logic
    const filteredOptions = options.filter(option => 
        option.toLowerCase().includes(filterText.toLowerCase())
    );

    // Click-outside-to-close logic
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
                        // Added: max-h-60 (fixed height) and overflow-y-auto (scroller)
                        className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                        {/* Added: Search input (only shows if options are more than 5) */}
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

                        {/* Changed: Map over filteredOptions */}
                        {filteredOptions.length > 0 ? filteredOptions.map(option => ( 
                            <div 
                                key={option} 
                                onClick={() => { onSelect(option); setIsOpen(false); setFilterText(''); }} 
                                className={`flex justify-between items-center px-4 py-2 cursor-pointer hover:bg-gray-100 ${selected === option ? 'bg-[#0D3A25] text-white' : 'text-gray-700'}`}
                            > 
                                <span>{option}</span> 
                                {onDeleteCategory && option !== 'All' && (<Trash2 size={16} className="text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setIsOpen(false); setFilterText(''); onDeleteCategory(option); }}/>)} 
                            </div> 
                        )) : (
                            <p className="text-center text-gray-500 py-2">No results</p>
                        )} 
                    </motion.div> 
                )} 
            </AnimatePresence> 
        </div> 
    ); 
};
const ActionButton = ({ children, onClick }) => (<button onClick={onClick} className="flex items-center text-white font-semibold py-2.5 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 cursor-pointer" style={{ backgroundColor: '#0D3A25' }}>{children}</button>);

// --- Main Page Component ---
export default function InventoryPage() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [stockFilter, setStockFilter] = useState('All');
    const [popup, setPopup] = useState({ type: null, data: null });
    const [isLoading, setIsLoading] = useState(true);

    // Fetch data from API on component mount
    useEffect(() => {
        fetchData();
    }, []);
    
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const productsRes = await fetch('/api/products');
            const productsData = await productsRes.json();
            setProducts(Array.isArray(productsData) ? productsData : []);

            const categoriesRes = await fetch('/api/categories');
            const categoriesData = await categoriesRes.json();
            setCategories(['All', ...(Array.isArray(categoriesData) ? categoriesData.map(c => c.name) : [])]);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            setProducts([]);
            setCategories(['All']);
        } finally {
            setIsLoading(false);
        }
    };
    
    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };
    
    const filteredProducts = products.filter(p => { const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory; const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()); let matchesStock = true; if (stockFilter === 'Low Stock (<10)') { matchesStock = p.remaining > 0 && p.remaining < 10; } else if (stockFilter === 'Out of Stock (0)') { matchesStock = p.remaining === 0; } return matchesCategory && matchesSearch && matchesStock; });

    const handleDeleteProduct = (productId) => setPopup({ type: 'deleteProduct', data: productId });
    const handleStockUpdate = (productId, action) => setPopup({ type: 'stock', data: { productId, action } });

    const handleAddProduct = async (product) => {
        if(!product.name || !product.purchasePrice || !product.salePrice || !product.remaining) return alert("Please fill all fields.");
        await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...product,
                purchasePrice: parseFloat(product.purchasePrice),
                salePrice: parseFloat(product.salePrice),
                remaining: parseInt(product.remaining),
            }),
        });
        setPopup({ type: null });
        fetchData(); // Database se data dobara load karein
    };

    const handleAddCategory = async (name) => {
        if (!name) return;
        await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        setPopup({ type: null });
        fetchData(); // Database se data dobara load karein
    };
    
    const handleDeleteCategory = (categoryName) => { const isCategoryInUse = products.some(p => p.category === categoryName); if (isCategoryInUse) { setPopup({ type: 'alert', data: `Cannot delete "${categoryName}" because it contains products.` }); } else { setPopup({ type: 'deleteCategory', data: categoryName }); } };

    const confirmDeleteProduct = async () => { await fetch(`/api/products/${popup.data}`, { method: 'DELETE' }); setPopup({ type: null }); fetchData(); };
    const confirmDeleteCategory = async () => { await fetch(`/api/categories/${encodeURIComponent(popup.data)}`, { method: 'DELETE' }); setSelectedCategory('All'); setPopup({ type: null }); fetchData(); };
    
    const confirmStockUpdate = async (quantity) => {
        const { productId, action } = popup.data;
        const productToUpdate = products.find(p => p._id === productId);
        if (!productToUpdate) return;
        
        const amount = action === 'add' ? parseInt(quantity) : -parseInt(quantity);
        const newRemaining = Math.max(0, parseInt(productToUpdate.remaining) + amount);

        await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remaining: newRemaining }),
        });
        setPopup({ type: null });
        fetchData();
    };

    const getInitialCategoryForPopup = () => { const realCategories = categories.filter(c => c !== 'All'); if (selectedCategory !== 'All') return selectedCategory; return realCategories[0] || ''; };

    return (
        <>
            <AnimatePresence>
                {popup.type === 'deleteProduct' && <ConfirmationPopup message="Are you sure you want to delete this product?" onConfirm={confirmDeleteProduct} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'deleteCategory' && <ConfirmationPopup message={`Are you sure you want to delete the "${popup.data}" category?`} onConfirm={confirmDeleteCategory} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'alert' && <AlertPopup message={popup.data} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'addCategory' && <AddCategoryPopup onSave={handleAddCategory} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'addProduct' && <AddProductPopup categories={categories.filter(c => c !== 'All')} initialCategory={getInitialCategoryForPopup()} onSave={handleAddProduct} onCancel={() => setPopup({ type: null })} />}
                {popup.type === 'stock' && <StockUpdatePopup productName={products.find(p=>p._id===popup.data.productId)?.name} action={popup.data.action} onSave={confirmStockUpdate} onCancel={() => setPopup({ type: null })} />}
            </AnimatePresence>

            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full space-y-6">
                 <motion.header variants={itemVariants} className="flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                        <div className="relative flex items-center"><Search className="absolute left-4 text-gray-400" size={20} /><input type="text" placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 pr-4 py-3 w-80 bg-white rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0D3A25]" /></div>
                        <CustomDropdown label="Category" options={categories} selected={selectedCategory} onSelect={setSelectedCategory} onDeleteCategory={handleDeleteCategory} />
                        <CustomDropdown label="Stock" options={['All', 'Low Stock (<10)', 'Out of Stock (0)']} selected={stockFilter} onSelect={setStockFilter} />
                    </div>
                    <ActionButton onClick={() => setPopup({ type: 'addCategory' })}><Plus size={16} className="mr-2"/> Add Category</ActionButton>
                </motion.header>
                <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">{selectedCategory === 'All' ? 'All Products' : selectedCategory}</h2>
                        <ActionButton onClick={() => setPopup({ type: 'addProduct' })}><Plus size={16} className="mr-2"/> Add Product</ActionButton>
                    </div>
                    <div className="flex items-center px-4 py-2 text-sm text-gray-500 font-medium"><span className="flex-grow">Product Name</span><span className="w-32 text-center">Purchase Price</span><span className="w-32 text-center">Sale Price</span><span className="w-32 text-center">Remaining</span><span className="w-32 text-center">Actions</span></div>
                    <motion.div variants={containerVariants} className="space-y-3">
                        {isLoading ? <Loader />  : filteredProducts.map((product) => (
                            <motion.div key={product._id} variants={itemVariants} className="flex items-center p-4 rounded-xl text-white transition-transform transform hover:scale-[1.01]" style={{ backgroundColor: '#0D3A25' }}>
                                <span className="font-medium flex-grow">{product.name}</span><span className="w-32 text-center">{product.purchasePrice}/-</span><span className="w-32 text-center">{product.salePrice}/-</span><span className="w-32 text-center">{product.remaining} pcs</span>
                                <div className="w-32 flex justify-center gap-4">
                                    <button onClick={() => handleStockUpdate(product._id, 'remove')} className="transition-transform hover:scale-125 cursor-pointer"><Minus size={18}/></button>
                                    <button onClick={() => handleDeleteProduct(product._id)} className="transition-transform hover:scale-125 cursor-pointer"><Trash2 size={18}/></button>
                                    <button onClick={() => handleStockUpdate(product._id, 'add')} className="transition-transform hover:scale-125 cursor-pointer"><Plus size={18}/></button>
                                </div>
                            </motion.div>
                        ))}
                         {!isLoading && filteredProducts.length === 0 && <p className="text-center text-gray-500 py-8">No products found. Add a new product to get started!</p>}
                    </motion.div>
                </motion.div>
            </motion.div>
        </>
    );
}