"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Users, UserX, Search, Edit2 } from 'lucide-react';
import Loader from '@/components/Loader';

// --- Reusable Components (No changes) ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

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
        <div className="flex items-center gap-2 justify-end">
            {isEditing ? (
            <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    className="font-bold text-lg text-red-600 bg-red-50 rounded-md p-1 w-28 text-right outline-none ring-2 ring-red-300"
                    autoFocus
                />
            ) : (
                <>
                    <p className="font-bold text-lg text-red-600">{customer.totalBalance.toLocaleString()}/-</p>
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-red-500 cursor-pointer" title="Edit Balance">
                        <Edit2 size={16} />
                    </button>
                </>
            )}
        </div>
    );
};

export default function RecoveryPage() {
    const [recoveryData, setRecoveryData] = useState({ customers: [], stats: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
          // Cache bypass add kar diya hai
          const res = await fetch(`/api/recovery?_=${new Date().getTime()}`, { cache: 'no-store' });
            const data = await res.json();
          if (data && data.customers){
                setRecoveryData(data);
            } else {
                setRecoveryData({ customers: [], stats: {} });
            }
        } catch (error) {
            console.error("Failed to fetch recovery data:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    // Registered customer ka balance update karne ke liye
    const handleUpdateBalance = async (customerId, updatedData) => {
        await fetch(`/api/customers/${customerId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
        });
        fetchData(); // Data refresh karein
    };

    // --- *** YEH FUNCTION UPDATE KIYA GAYA HAI (FIX) *** ---
    const handleAdjustNormalBalance = async (customer, newTotalBalance) => {
        // Yeh function ab "Normal Customer" ko "Register" karega
        // aur balance difference ko "openingBalance" mein save karega.
        
        try {
            // 1. Calculate karein ke naya openingBalance kya hona chahiye
            const salesBalanceOnly = customer.totalBalance || 0;
            const newOpeningBalance = parseFloat(newTotalBalance) - salesBalanceOnly;

            // 2. Naya customer object banayein
            const newCustomerData = {
                name: customer.name,
                phone: customer.phone,
                city: customer.city || "N/A", 
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

    
    const filteredCustomers = (recoveryData.customers || []).filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm))
    );

    if (isLoading) {
        return <Loader />;
    }

    return (
        <AnimatePresence>
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 max-w-7xl mx-auto">
                <motion.div variants={itemVariants}>
                    <h1 className="text-4xl font-bold text-gray-800">Recovery Center</h1>
                    <p className="text-gray-500 mt-1">Manage all outstanding customer dues here.</p>
                </motion.div>

                <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard icon={DollarSign} title="Total Outstanding Dues" value={`${recoveryData.stats.totalDues?.toLocaleString() || 0}/-`} />
                    <StatCard icon={Users} title="Customers with Dues" value={recoveryData.stats.totalCustomersWithDues || 0} />
                    <StatCard icon={UserX} title="Top Debtor" value={recoveryData.stats.topDebtorName || 'N/A'} />
                </motion.div>

                <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
                        <h2 className="text-2xl font-bold text-gray-800">Pending Payments</h2>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input 
                                type="text" 
                                placeholder="Search by name or phone..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="pl-12 pr-4 py-3 w-full bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-transparent focus:border-[#0D3A25] focus:scale-105 transition-transform duration-300" 
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-2 border-gray-200">
                                    <th className="p-4 text-sm font-semibold text-gray-500">CUSTOMER</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500">TYPE</th>
                                    <th className="p-4 text-sm font-semibold text-gray-500 text-right">TOTAL DUE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.length > 0 ? (
                                    filteredCustomers.map(customer => (
                                        <motion.tr key={customer.phone || customer._id} variants={itemVariants} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-4 font-semibold text-gray-800">
                                                <div className="flex items-center gap-3 cursor-pointer">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[#0D3A25]">
                                                        {customer.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div><p>{customer.name}</p><p className="text-xs font-normal text-gray-500">{customer.phone}</p></div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${customer.isNormal ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {customer.isNormal ? 'Normal' : 'Registered'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                             <EditableBalance
                                                customer={customer}
                                                onUpdate={handleUpdateBalance}
                                                onAdjust={handleAdjustNormalBalance} // <-- Yeh naya logic use karega
                                                isNormal={customer.isNormal}
                                            />
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="3" className="text-center py-10 text-gray-500"><p>Congratulations! No outstanding dues found.</p></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}