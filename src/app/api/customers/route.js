import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

const DB_NAME = "crm_db";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const view = searchParams.get('view');

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        if (view === 'normal') {
            const registeredCustomers = await db.collection('customers').find({}, { projection: { name: 1, phone: 1 } }).toArray();
            const registeredCustomerSet = new Set(registeredCustomers.map(c => `${c.name.trim()}-${c.phone.trim()}`));

            const salesCustomers = await db.collection('sales').aggregate([
                {
                    $group: {
                        _id: { name: "$customerName", phone: "$customerPhone" },
                        salesData: { $push: "$$ROOT" }
                    }
                },
                {
                    $addFields: {
                        name: "$_id.name",
                        phone: "$_id.phone",
                        isNormal: true,
                        totalPurchases: { $size: '$salesData' },
                        amountSpent: { $sum: '$salesData.subTotal' },
                        totalBalance: { $sum: '$salesData.balance' }, // BALANCE KI CALCULATION
                        lastPurchaseDate: { $max: '$salesData.invoiceDate' }
                    }
                },
                { $project: { _id: 0, salesData: 0 } }
            ]).toArray();

            const normalCustomers = salesCustomers.filter(sc => !registeredCustomerSet.has(`${sc.name.trim()}-${sc.phone.trim()}`));
            return NextResponse.json(normalCustomers);

        } else {
            // Registered Customers ka logic update kiya gaya hai
            const customers = await db.collection('customers').aggregate([
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
                    totalPurchases: { $size: '$salesData' }, 
                    amountSpent: { $sum: '$salesData.subTotal' },
                    salesBalance: { $sum: '$salesData.balance'}, // Sales se balance
                    lastPurchaseDate: { $max: '$salesData.invoiceDate' } 
                }},
                { $addFields: {
                    // openingBalance ko total balance mein add karein
                    totalBalance: { $add: [ { $ifNull: [ "$openingBalance", 0 ] }, { $ifNull: [ "$salesBalance", 0 ] } ] } 
                }},
                { $project: { salesData: 0 } }
            ]).sort({ name: 1 }).toArray();
            return NextResponse.json(customers);
        }

    } catch (e) {
        console.error("Customers API Error:", e);
        return NextResponse.json({ error: 'Error fetching customers data' }, { status: 500 });
    }
}

// POST function waisa hi rahega
export async function POST(request) {
    try {
        const customer = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const result = await db.collection('customers').insertOne(customer);
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error adding customer' }, { status: 500 });
    }
}