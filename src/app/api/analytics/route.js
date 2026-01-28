// Updated route.js to handle custom filter
// No major changes needed besides adding custom logic.
// For custom, startDate and endDate from query params.
// Chart: Group by day for custom range.

import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { startOfDay, endOfDay, subDays, startOfYear, getYear, differenceInDays, addDays, format } from 'date-fns';

const DB_NAME = "crm_db";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter') || 'today';
        let startDate, endDate;

        const now = new Date();

        if (filter === 'today') {
            startDate = startOfDay(now);
            endDate = endOfDay(now);
        } else if (filter === 'last7days') {
            startDate = startOfDay(subDays(now, 6));
            endDate = endOfDay(now);
        } else if (filter === 'monthly') { // 'monthly' is 'This Year'
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = endOfDay(now);
        } else if (filter === 'custom') { // New custom filter
            const from = searchParams.get('from');
            const to = searchParams.get('to');
            if (!from || !to) throw new Error("Missing from/to for custom filter");
            startDate = startOfDay(new Date(from));
            endDate = endOfDay(new Date(to));
        } else {
            throw new Error("Invalid filter");
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // --- Real-time data ke liye saari collections fetch karein ---
        const allProducts = await db.collection('products').find({}).toArray();
        const allSales = await db.collection('sales').find({}).toArray();
        const registeredCustomers = await db.collection('customers').find({}).toArray();
        // --- FIX: 'purchases' collection ko bhi fetch karein ---
        const allPurchases = await db.collection('purchases').find({}).toArray();
        
        // --- Real-time Stats Calculation (Dues) ---
        // (Yeh logic waisi hi rahegi)
      // 1. Registered Customers ka (Opening Balance) jama karein
        const registeredCustomersMap = new Map(registeredCustomers.map(c => [
            `${c.name.trim()}-${c.phone.trim()}`, 
            c.openingBalance || 0
        ]));
        
        // 2. Sabhi customers ka (Sales Balance) jama karein
        const salesBalanceMap = new Map();
        allSales.forEach(sale => {
            if (sale.balance && sale.balance !== 0) {
                const identifier = `${sale.customerName.trim()}-${sale.customerPhone.trim()}`;
                salesBalanceMap.set(identifier, (salesBalanceMap.get(identifier) || 0) + sale.balance);
            }
        });

        let totalDues = 0;

        // 3. Registered Customers ka Total Balance (Opening + Sales) calculate karein
        registeredCustomersMap.forEach((openingBalance, identifier) => {
            const salesBalance = salesBalanceMap.get(identifier) || 0;
            const totalBalance = openingBalance + salesBalance;
            if (totalBalance > 0) { // Sirf positive dues jama karein
                totalDues += totalBalance;
            }
        });

        // 4. Normal Customers ka Total Balance (Sirf Sales) calculate karein
        salesBalanceMap.forEach((salesBalance, identifier) => {
            if (!registeredCustomersMap.has(identifier)) { // Agar customer registered nahi hai
                if (salesBalance > 0) { // Sirf positive dues jama karein
                    totalDues += salesBalance;
                }
            }
        });


        // --- Filtered Data for Chart/Cards ---
        const salesInPeriod = allSales.filter(sale => {
            const saleDate = new Date(sale.invoiceDate);
            return saleDate >= startDate && saleDate <= endDate;
        });
        
        // --- FIX: Calculate Purchase Value based on selected period ---
        const purchasesInPeriod = allPurchases.filter(p => {
            const purchaseDate = new Date(p.purchaseDate);
            return purchaseDate >= startDate && purchaseDate <= endDate;
        });
        
        // Nayi calculation: Sirf period ki purchases ko sum karein
        const totalPurchaseValue = purchasesInPeriod.reduce((sum, p) => sum + (p.totalCost || 0), 0);
        // --- END FIX ---


        const productPurchasePriceMap = new Map(allProducts.map(p => [p.name, p.purchasePrice]));

        // --- Baaki Calculations (waisi hi rahengi) ---
    let totalProfit = 0;
salesInPeriod.forEach(sale => { 
    let saleProfit = 0;
    (sale.items || []).forEach(item => { 
        const purchasePrice = productPurchasePriceMap.get(item.desc) || 0; 
        saleProfit += ((item.price || 0) - purchasePrice) * (item.qty || 0); 
    }); 
    // Har sale ke profit se us sale ka discount minus karein
    totalProfit += (saleProfit - (sale.discount || 0));
});
        // FIX: Revenue ko 'subTotal' (before discount) ke bajaye 'total' (after discount) se calculate karein
const totalRevenue = salesInPeriod.reduce((sum, sale) => sum + (sale.total || sale.subTotal || 0), 0);
        const totalSales = salesInPeriod.length;
        const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        const totalCustomers = registeredCustomers.length;
        
        let chartData;
        let chartLabel = 'Sales Overview';
      if (filter === 'today') {
            chartLabel = "Today's Overview (by Hour)";
            chartData = Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, total: 0, profit: 0 }));
            salesInPeriod.forEach(sale => { 
                const hour = (new Date(sale.invoiceDate).getUTCHours() + 5) % 24; 
                chartData[hour].total += (sale.total || sale.subTotal || 0); // Use 'total' for revenue
                let saleProfit = 0;
                (sale.items || []).forEach(item => { const pp = productPurchasePriceMap.get(item.desc) || 0; saleProfit += (item.price - pp) * item.qty; });
                chartData[hour].profit += (saleProfit - (sale.discount || 0)); // FIX: Use 'hour' and add profit
            });
        
       } else if (filter === 'last7days') {
            chartLabel = 'Last 7 Days Overview';
            chartData = Array(7).fill(0).map((_, i) => ({ name: subDays(now, 6 - i).toLocaleDateString('en-US', { weekday: 'short' }), total: 0, profit: 0 }));
            salesInPeriod.forEach(sale => { 
                const dayIndex = 6 - Math.floor((endOfDay(now) - startOfDay(new Date(sale.invoiceDate))) / (1000 * 3600 * 24)); 
                if (dayIndex >= 0 && dayIndex < 7) {
                    chartData[dayIndex].total += (sale.total || sale.subTotal || 0); // FIX: Use 'total' for revenue
                    let saleProfit = 0;
                    (sale.items || []).forEach(item => { const pp = productPurchasePriceMap.get(item.desc) || 0; saleProfit += (item.price - pp) * item.qty; });
                    chartData[dayIndex].profit += (saleProfit - (sale.discount || 0));
                }
            });
        } else if (filter === 'custom') { // New custom chart logic (group by day)
            const daysDiff = differenceInDays(endDate, startDate) + 1;
            chartLabel = `Custom Range Overview (${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')})`;
            chartData = Array(daysDiff).fill(0).map((_, i) => {
                const date = addDays(startDate, i);
                return { name: format(date, 'MMM d'), total: 0, profit: 0 };
            });
            salesInPeriod.forEach(sale => { 
                const saleDate = new Date(sale.invoiceDate);
                const dayIndex = differenceInDays(saleDate, startDate);
                if (dayIndex >= 0 && dayIndex < daysDiff) {
                    chartData[dayIndex].total += (sale.total || sale.subTotal || 0);
                    let saleProfit = 0;
                    (sale.items || []).forEach(item => { const pp = productPurchasePriceMap.get(item.desc) || 0; saleProfit += (item.price - pp) * item.qty; });
                    chartData[dayIndex].profit += (saleProfit - (sale.discount || 0));
                }
            });
        } else {
            chartLabel = `Overview (${getYear(now)})`;
            chartData = Array(12).fill(0).map((_, i) => ({ name: new Date(0, i).toLocaleString('en-US', { month: 'short' }), total: 0, profit: 0 }));
            salesInPeriod.forEach(sale => { 
                const month = new Date(sale.invoiceDate).getMonth();
                chartData[month].total += (sale.total || sale.subTotal);
                let saleProfit = 0;
                (sale.items || []).forEach(item => { const pp = productPurchasePriceMap.get(item.desc) || 0; saleProfit += (item.price - pp) * item.qty; });
                chartData[month].profit += (saleProfit - (sale.discount || 0));
            });
        }


        const topSellingProducts = Object.entries(salesInPeriod.reduce((acc, sale) => { (sale.items || []).forEach(item => { if (item.desc) acc[item.desc] = (acc[item.desc] || 0) + (parseInt(item.qty, 10) || 0); }); return acc; }, {})).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, totalSold]) => ({ name, totalSold }));
        const recentSales = allSales.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate)).slice(0, 5);

        return NextResponse.json({
            totalRevenue, totalSales, totalProfit, avgSaleValue, totalCustomers,
            chartLabel, chartData, topSellingProducts, recentSales,
            // totalPurchaseValue ab 'today' ka total dikhayega (jab dashboard se call hoga)
            totalPurchaseValue, 
            recoveryData: { totalDues, percentage: 0 } 
        });

    } catch (e) {
        console.error("Analytics API Error:", e.message);
        return NextResponse.json({ error: 'Error fetching analytics data', details: e.message }, { status: 500 });
    }
}