"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Database, Download, CheckCircle, AlertTriangle, FileJson, Hash } from 'lucide-react';
import { format } from 'date-fns';

// --- Reusable Components ---
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

const StatCard = ({ collectionName, count }) => (
    <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
                <FileJson className="w-6 h-6 text-[#0D3A25]" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800">{collectionName}</h3>
                <p className="text-sm text-gray-500">Collection</p>
            </div>
        </div>
        <div className="text-right">
            <p className="text-2xl font-bold text-[#0D3A25]">{count}</p>
            <p className="text-sm text-gray-500">Records</p>
        </div>
    </motion.div>
);

const FilterButton = ({ label, value, currentFilter, setFilter }) => (
    <button
        onClick={() => setFilter(value)}
        className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${currentFilter === value ? 'bg-[#0D3A25] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
    >
        {label}
    </button>
);


export default function BackupPage() {
    const [stats, setStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [backupStatus, setBackupStatus] = useState({ message: '', type: '' });
    const [filter, setFilter] = useState('lifetime'); // Default filter

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/backup/stats');
                const data = await res.json();
                if (Array.isArray(data)) setStats(data);
            } catch (error) { console.error("Failed to fetch backup stats:", error); } 
            finally { setIsLoading(false); }
        };
        fetchStats();
    }, []);

    const handleCreateBackup = async () => {
        setIsBackingUp(true);
        setBackupStatus({ message: '', type: '' });
        
        // API call se file download trigger karein
        try {
            const res = await fetch(`/api/backup?filter=${filter}`);
            if (!res.ok) {
                 const errorData = await res.json();
                 throw new Error(errorData.message || 'Failed to create backup from server.');
            }
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const formattedDate = format(new Date(), 'yyyy-MM-dd');
            link.href = url;
            link.download = `mr-denum_sales_${filter}_${formattedDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            setBackupStatus({ message: 'Backup downloaded successfully!', type: 'success' });

        } catch (error) {
             setBackupStatus({ message: error.message, type: 'error' });
        } finally {
            setIsBackingUp(false);
        }
    };

    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><p>Loading database stats...</p></div>;
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 max-w-4xl mx-auto">
            <motion.div variants={itemVariants} className="text-center">
                <div className="inline-block p-5 bg-white rounded-full shadow-lg"><Database className="w-16 h-16 text-[#0D3A25]" /></div>
                <h1 className="text-4xl font-bold text-gray-800 mt-4">Database Backup</h1>
                <p className="text-gray-500 mt-2 max-w-2xl mx-auto">Select a time period and download a user-friendly CSV backup of your sales data.</p>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-white p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold text-gray-800 mb-4">1. Select Time Period for Sales Backup</h2>
                <div className="flex items-center justify-center gap-3 p-2 bg-gray-100 rounded-xl">
                    <FilterButton label="Today" value="today" currentFilter={filter} setFilter={setFilter} />
                    <FilterButton label="Last 7 Days" value="last7days" currentFilter={filter} setFilter={setFilter} />
                    <FilterButton label="This Year" value="thisyear" currentFilter={filter} setFilter={setFilter} />
                    <FilterButton label="Lifetime" value="lifetime" currentFilter={filter} setFilter={setFilter} />
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="text-center pt-4">
                <h2 className="text-xl font-bold text-gray-800 mb-4">2. Generate & Download</h2>
                <button 
                    onClick={handleCreateBackup}
                    disabled={isBackingUp}
                    className="flex items-center justify-center gap-3 w-full max-w-md mx-auto text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform focus:outline-none bg-[#0D3A25] hover:bg-opacity-90 hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isBackingUp ? (<><motion.div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}/>Processing...</>) 
                                 : (<><Download className="w-6 h-6" />Download Sales Backup</>)}
                </button>
                {backupStatus.message && (
                    <motion.div initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}
                        className={`mt-6 flex items-center justify-center gap-2 p-3 rounded-lg ${
                            backupStatus.type === 'success' ? 'bg-green-100 text-green-800' :
                            backupStatus.type === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                        }`}
                    >
                        {backupStatus.type === 'success' && <CheckCircle size={20} />}
                        {backupStatus.type === 'error' && <AlertTriangle size={20} />}
                        <p className="font-semibold">{backupStatus.message}</p>
                    </motion.div>
                )}
            </motion.div>
            
            <motion.div variants={containerVariants} className="pt-6">
                 <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">Total Records in Database</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {stats.map(stat => (<StatCard key={stat.name} collectionName={stat.name} count={stat.count} />))}
                </div>
            </motion.div>
        </motion.div>
    );
}