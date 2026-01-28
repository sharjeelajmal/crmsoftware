"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, PackagePlus, RefreshCw, ClipboardList } from 'lucide-react';
import { FaWallet } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { AddProductPopup } from '@/components/AddProductPopup';
import { CustomDropdown } from '@/components/CustomDropdown';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Loader from '@/components/Loader';

// --- Reusable Components ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

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

const LowStockItem = ({ name, price, remaining }) => (<div className="flex items-center p-4 rounded-xl text-white" style={{ backgroundColor: '#0D3A25' }}><span className="font-medium flex-grow">{name}</span><span className="w-24 text-center">{price}/-</span><span className="w-24 text-center">{remaining} pcs</span></div>);
const CalcButton = ({ children, className, style, onClick }) => (<button style={style} onClick={onClick} className={`bg-gray-100 text-gray-800 font-bold py-3 rounded-md hover:bg-gray-200 transition-colors ${className}`}>{children}</button>);
const ActionButton = ({ children, onClick }) => (<button onClick={onClick} className="w-full text-white font-semibold py-3 rounded-xl transition-opacity hover:opacity-90 cursor-pointer" style={{ backgroundColor: '#0D3A25' }}>{children}</button>);


export default function Home() {
    const [dashboardData, setDashboardData] = useState(null);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddProductPopup, setShowAddProductPopup] = useState(false);
const [stockFilter, setStockFilter] = useState('Low Stock (<10)');
    // Calculator State (original)
    const [currentValue, setCurrentValue] = useState('0');
    const [expression, setExpression] = useState('');
    const [operator, setOperator] = useState(null);
    const [prevValue, setPrevValue] = useState(null);
const filteredLowStockProducts = lowStockProducts.filter(p => {
        if (stockFilter === 'Low Stock (<10)') {
            return p.remaining > 0 && p.remaining < 10;
        }
        if (stockFilter === 'Out of Stock (0)') {
            return p.remaining === 0;
        }
        return false;
    });
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [analyticsRes, productsRes, categoriesRes] = await Promise.all([
                fetch('/api/analytics?filter=today'),
                fetch('/api/products'),
                fetch('/api/categories')
            ]);
            
            const analyticsData = await analyticsRes.json();
            setDashboardData(analyticsData);

            const productsData = await productsRes.json();
            if(Array.isArray(productsData)){
                setLowStockProducts(productsData.filter(p => p.remaining > 0 && p.remaining < 10));
            }

            const categoriesData = await categoriesRes.json();
            setCategories(Array.isArray(categoriesData) ? categoriesData.map(c => c.name) : []);
        } catch (error) { 
            console.error("Failed to fetch dashboard data:", error); 
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddProduct = async (product) => {
        if(!product.name || !product.purchasePrice || !product.salePrice || !product.remaining) return alert("Please fill all fields.");
        await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...product, purchasePrice: parseFloat(product.purchasePrice), salePrice: parseFloat(product.salePrice), remaining: parseInt(product.remaining) }), });
        setShowAddProductPopup(false);
        fetchData(); // Data refresh karein
    };
    
    // Calculator Logic (original)
    const inputDigit = (d) => setCurrentValue(currentValue === '0' ? String(d) : currentValue + d);
    const clearAll = () => { setCurrentValue('0'); setExpression(''); setPrevValue(null); setOperator(null); };
    const calculate = (a, b, op) => { switch (op) { case '+': return a + b; case '-': return a - b; case '*': return a * b; case '/': return b === 0 ? 'Error' : a / b; default: return b; } };
    const performOperation = (nextOp) => { setExpression(expression + currentValue + ` ${nextOp} `); if (prevValue && operator) { const result = calculate(prevValue, parseFloat(currentValue), operator); setPrevValue(result); } else { setPrevValue(parseFloat(currentValue)); } setCurrentValue('0'); setOperator(nextOp); };
    const handleEquals = () => { if (operator && prevValue !== null) { const result = calculate(prevValue, parseFloat(currentValue), operator); setExpression(String(result)); setCurrentValue(String(result)); setPrevValue(null); setOperator(null); }};

    if (isLoading) {
        return <Loader />;
    }

    return (
        <>
            <AnimatePresence>
                {showAddProductPopup && <AddProductPopup categories={categories} initialCategory={categories[0] || ''} onSave={handleAddProduct} onCancel={() => setShowAddProductPopup(false)} />}
            </AnimatePresence>

            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-6">
                  {/* --- STAT CARDS (UPDATED) --- */}
            <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard icon={FaWallet} title="Today's Income" value={`${dashboardData?.totalRevenue?.toLocaleString() || 0}/-`} />
                <StatCard icon={ShoppingCart} title="Today's Sales" value={dashboardData?.totalSales || 0} />
                <StatCard icon={RefreshCw} title="Total Recovery Due" value={`${dashboardData?.recoveryData?.totalDues?.toLocaleString() || 0}/-`} />
                {/* --- FIX: Title updated --- */}
                <StatCard icon={ClipboardList} title="Today's Purchasing Value" value={`${dashboardData?.totalPurchaseValue?.toLocaleString() || 0}/-`} />
            </motion.div>
                        {/* --- SALE ANALYTICS CHART (UPDATED) --- */}
            <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Today&apos;s Sales (by Hour)</h2>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <AreaChart data={dashboardData?.chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                             <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0D3A25" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#0D3A25" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(val) => `${val/1000}k`}/>
                            <Tooltip contentStyle={{backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(5px)', borderRadius: '10px'}}/>
                            <Area type="monotone" dataKey="total" name="Total Sale" stroke="#0D3A25" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
                   <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm">
    <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Stock Alert</h2>
        {/* Naya Filter Dropdown */}
        <CustomDropdown 
            options={['Low Stock (<10)', 'Out of Stock (0)']} 
            selected={stockFilter} 
            onSelect={setStockFilter}
            containerClassName="w-40"
        />
    </div>
    <div className="space-y-3 h-40 overflow-y-auto pr-2">
        {filteredLowStockProducts.length > 0 ? filteredLowStockProducts.map(p => (
            <LowStockItem key={p._id} name={p.name} price={p.salePrice} remaining={p.remaining} />
        )) : <p className="text-center text-gray-500 pt-8">
            {stockFilter === 'Low Stock (<10)' ? 'No low stock items!' : 'No out of stock items!'}
        </p>}
    </div>
</motion.div>
                    </div>

                    <motion.div variants={containerVariants} className="space-y-6">
                        {/* --- CALCULATOR (Original) --- */}
                        <motion.div variants={itemVariants} className="bg-white p-4 rounded-xl shadow-sm">
                            <h2 className="text-xl font-semibold text-gray-800 mb-2">Calculator</h2>
                            <div className="bg-gray-100 p-4 rounded-md text-right mb-4"><div className="text-gray-500 text-xl h-7 truncate">{expression || "0"}</div><div className="text-gray-800 text-5xl font-mono truncate">{currentValue}</div></div>
                            <div className="grid grid-cols-4 gap-2">
                                <CalcButton onClick={clearAll}>AC</CalcButton><CalcButton onClick={() => setCurrentValue(currentValue.length > 1 ? currentValue.slice(0, -1) : '0')}>DEL</CalcButton><CalcButton onClick={() => setCurrentValue(String(parseFloat(currentValue)/100))}>%</CalcButton><CalcButton onClick={() => performOperation('/')}>/</CalcButton>
                                {'789'.split('').map(c => <CalcButton key={c} onClick={() => inputDigit(c)}>{c}</CalcButton>)} <CalcButton onClick={() => performOperation('*')}>x</CalcButton>
                                {'456'.split('').map(c => <CalcButton key={c} onClick={() => inputDigit(c)}>{c}</CalcButton>)} <CalcButton onClick={() => performOperation('-')}>-</CalcButton>
                                {'123'.split('').map(c => <CalcButton key={c} onClick={() => inputDigit(c)}>{c}</CalcButton>)} <CalcButton onClick={() => performOperation('+')}>+</CalcButton>
                                <CalcButton className="col-span-2" onClick={() => inputDigit('0')}>0</CalcButton><CalcButton onClick={() => !currentValue.includes('.') && setCurrentValue(currentValue + '.')}>.</CalcButton><CalcButton style={{ backgroundColor: '#0D3A25', color: 'white' }} onClick={handleEquals}>=</CalcButton>
                            </div>
                        </motion.div>
                        
                        {/* --- QUICK ACTIONS & ADD ITEM (Original) --- */}
           <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
    <div className="flex flex-col items-center gap-4">
        <Link href="/sales/new" className="w-full"><ActionButton>New Sale</ActionButton></Link>
        {/* Link aur text yahan update kiya gaya hai */}
        <Link href="/purchasing" className="w-full"><ActionButton>New Purchase</ActionButton></Link>
    </div>
</motion.div>
                        <motion.div variants={itemVariants} className="bg-white p-6 rounded-xl shadow-sm flex flex-col items-center">
                            <div className="w-full p-4 bg-gray-100 rounded-lg flex flex-col items-center mb-4">
                                <PackagePlus size={48} style={{ color: '#0D3A25' }}/>
                            </div>
                            <ActionButton onClick={() => setShowAddProductPopup(true)}>Add New Item</ActionButton>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </>
    );
}