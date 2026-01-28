"use client";
import Loader from '@/components/Loader';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Printer } from 'lucide-react';

// Yeh non-editable invoice design hai jo data show karwane ke liye istemal hoga
const StaticInvoiceDisplay = ({ sale }) => {
    if (!sale) return null;
    return (
        <div id="invoice-section-view" className="bg-white max-w-4xl mx-auto font-sans">
             <header className="p-8" style={{ backgroundColor: '#F6F6F6' }}>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold tracking-wider" style={{color: '#111827'}}>INVOICE</h1>
                        <p className="font-medium mt-2 text-sm" style={{color: '#4B5563'}}>Invoice No. {String(sale.invoiceNumber).padStart(3, '0')}</p>
                        <p className="text-xs font-medium" style={{color: '#4B5563'}}>{new Date(sale.invoiceDate).toLocaleDateString()}</p>
                        <p className="text-xs font-medium" style={{color: '#4B5563'}}>{new Date(sale.invoiceDate).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                        <div className="flex justify-end items-center"><Image src="/logo.png" alt="Mr. Denum Logo" width={50} height={50} /><h2 className="text-2xl font-bold ml-3" style={{color: '#0D3A25'}}>Mr. Denum</h2></div>
                        <p className="text-xs mt-2" style={{color: '#4B5563'}}>Shop# 02, Noor Plaza Basement, Tire market near<br/>Rasheed center Landa Bazar Lahore</p>
                        <p className="text-xs font-semibold mt-1" style={{color: '#4B5563'}}>Rashid Ali: 03214361127</p>
                        <p className="text-xs font-semibold" style={{color: '#4B5563'}}>Bashir Ahmad: 03217290003</p>
                    </div>
                </div>
            </header>
            <div className="p-8">
                <div className="w-full flex justify-end mb-4">
                    <div className="w-1/3">
                        <h3 className="text-md font-semibold border-b pb-1 mb-1 text-right" style={{borderColor: '#000'}}>Customer Details</h3>
                        <p className="text-sm font-medium w-full p-1 text-right">{sale.customerName}</p>
                        <p className="text-xs w-full p-1 text-right">{sale.customerPhone}</p>
                    </div>
                </div>
                <table className="w-full mb-4 border-collapse">
                     <thead><tr style={{backgroundColor: '#0D3A25'}}><th className="text-left font-semibold p-2 text-sm text-white">Description</th><th className="font-semibold p-2 text-sm text-white">QTY</th><th className="font-semibold p-2 text-sm text-white">Price</th><th className="font-semibold p-2 text-sm text-white">Amount</th></tr></thead>
                     <tbody>{sale.items.map((item, index) => { const amount = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0); return (<tr key={index} className="border text-sm"><td className="p-1.5 border">{item.desc}</td><td className="p-1.5 text-center border">{item.qty}</td><td className="p-1.5 text-center border">{item.price}</td><td className="p-1.5 text-center border">{amount.toFixed(0)}</td></tr>)})}</tbody>
                </table>
                <div className="flex justify-end mb-4">
                    <table className="w-56 text-sm">
                        <tbody>
                            <tr><td className="font-semibold pr-4">Total:</td><td className="text-right">{sale.total.toFixed(0)}</td></tr>
                            <tr><td className="font-semibold pr-4">Others:</td><td className="text-right">{sale.others}</td></tr>
                            <tr><td className="font-semibold pr-4">Discount:</td><td className="text-right">{sale.discount}</td></tr>
                            <tr className="font-bold text-md border-t-2 border-black"><td className="pt-2 pr-4">Sub Total:</td><td className="pt-2 text-right">{sale.subTotal.toFixed(0)}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
             <footer style={{ backgroundColor: '#F6F6F6' }}>
                <div className="p-8">
                    <div className="border-t-2 border-black pt-6">
                        <div className="mb-4"><h3 className="text-lg font-bold text-left mb-3">Payment Details</h3><div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs"><div><p><span className="font-semibold">Bank Name:</span> Meezan Bank</p><p><span className="font-semibold">Account Name:</span> Muhammad Waqar</p><p><span className="font-semibold">Account Number:</span> 02760102977856</p></div><div><p><span className="font-semibold">Bank Name:</span> Faisal Bank</p><p><span className="font-semibold">Account Name:</span> Muhammad Waqar</p><p><span className="font-semibold">Account Number:</span> 3241301000004794</p></div><div><p><span className="font-semibold">Bank Name:</span> UBL Bank</p><p><span className="font-semibold">Account Name:</span> Muhammad Waqar</p><p><span className="font-semibold">Account Number:</span> 1569328218288</p></div><div><p><span className="font-semibold">Bank Name:</span> MCB Bank</p><p><span className="font-semibold">Account Name:</span> Muhammad Waqar</p><p><span className="font-semibold">Account Number:</span> 0000000006375057</p></div></div></div>
                        <div className="text-center text-md text-white p-2 rounded-lg mb-6" style={{backgroundColor: '#0D3A25', fontFamily: 'var(--font-noto-nastaliq-urdu)'}}>براہ کرم اپنی سامان موقع پر تسلی سے گن کر لیں۔ بعد میں ہم ذمہ دار نہ ہوں گے۔</div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default function ViewSalePage() {
    const [sale, setSale] = useState(null);
    const params = useParams();
    const router = useRouter();

    useEffect(() => {
        if (params.id) {
            const fetchSale = async () => {
                const res = await fetch(`/api/sales/${params.id}`);
                const data = await res.json();
                setSale(data);
            };
            fetchSale();
        }
    }, [params.id]);

   if (!sale) return <Loader />;

    return (
        <div>
            <StaticInvoiceDisplay sale={sale} />
            <div className="flex justify-between items-center mt-8 max-w-4xl mx-auto no-print">
                <button onClick={() => router.back()} className="flex items-center font-semibold text-sm cursor-pointer" style={{color: '#4B5563'}}><ArrowLeft size={16} className="mr-2" /> Back to Sales</button>
                <button onClick={() => window.print()} className="flex items-center text-white font-semibold py-2 px-5 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: '#0D3A25' }}><Printer size={16} className="mr-2" /> Print</button>
            </div>
        </div>
    );
}