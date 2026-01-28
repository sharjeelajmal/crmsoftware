import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

const DB_NAME = "crm_db";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // --- Step 1: Registered Customers ka balance calculate karein ---
        const registeredCustomers = await db.collection('customers').aggregate([
            // --- FIX: $lookup ko pipeline use karne ke liye change kiya gaya hai ---
            {
                $lookup: {
                    from: 'sales',
                    let: { customerName: "$name", customerPhone: "$phone" },
                    pipeline: [
                        { $match: {
                            $expr: {
                                $and: [
                                    { $eq: [ "$customerName", "$$customerName" ] },
                                    { $eq: [ "$customerPhone", "$$customerPhone" ] }
                                ]
                            }
                        } }
                    ],
                    as: 'salesData'
                }
            },
            // --- END FIX ---
            { $addFields: { 
                salesBalance: { $sum: '$salesData.balance' } 
            }},
            { $addFields: {
                totalBalance: { $add: [ { $ifNull: [ "$openingBalance", 0 ] }, { $ifNull: [ "$salesBalance", 0 ] } ] } 
            }},
            { $project: { salesData: 0 } } // salesData ko remove kar dein
        ]).toArray();

        // --- Step 2: Normal Customers ka balance calculate karein ---
        const registeredCustomerSet = new Set(registeredCustomers.map(c => `${c.name.trim()}-${c.phone.trim()}`));
        
        // Sab sales fetch karein, chahe balance 0 ho ya na ho
        const allSales = await db.collection('sales').find({}).toArray();
        
        const normalCustomersMap = new Map();
        allSales.forEach(sale => {
            const identifier = `${sale.customerName.trim()}-${sale.customerPhone.trim()}`;
            if (!registeredCustomerSet.has(identifier)) {
                if (!normalCustomersMap.has(identifier)) {
                    normalCustomersMap.set(identifier, {
                        name: sale.customerName,
                        phone: sale.customerPhone,
                        isNormal: true,
                        totalBalance: 0,
                    });
                }
                normalCustomersMap.get(identifier).totalBalance += (sale.balance || 0);
            }
        });
        
        const normalCustomers = Array.from(normalCustomersMap.values());
        
        // --- Step 3: Dono lists ko milayein aur sirf udhaar wale customers rakhein ---
        const allDebtors = [...registeredCustomers, ...normalCustomers]
            .filter(c => c.totalBalance > 0) // Sirf unko rakhein jinka balance 0 se zyada hai
            .sort((a, b) => b.totalBalance - a.totalBalance);

        // --- Step 4: Final Stats Calculate Karein ---
        const totalDues = allDebtors.reduce((sum, customer) => sum + customer.totalBalance, 0);
        const totalCustomersWithDues = allDebtors.length;
        const topDebtor = allDebtors.length > 0 ? allDebtors[0] : null;

        return NextResponse.json({
            customers: allDebtors,
            stats: {
                totalDues,
                totalCustomersWithDues,
                topDebtorName: topDebtor ? topDebtor.name : 'N/A',
            }
        });

    } catch (e) {
        console.error("Recovery API Error:", e);
        return NextResponse.json({ error: 'Error fetching recovery data' }, { status: 500 });
    }
}