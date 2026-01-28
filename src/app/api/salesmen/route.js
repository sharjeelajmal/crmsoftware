import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

const DB_NAME = "crm_db";
const COLLECTION_NAME = "salesmen";

// Sabhi salesmen ka data get karne ke liye
export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        const salesmen = await db.collection(COLLECTION_NAME).find({})
            .sort({ createdAt: -1 }) // Sabse naya salesman sabse upar
            .toArray();
            
        return NextResponse.json(salesmen);
    } catch (e) {
        return NextResponse.json({ error: 'Error fetching salesmen' }, { status: 500 });
    }
}

// Naya salesman add karne ke liye (Updated fields ke saath)
export async function POST(request) {
    try {
        const salesmanData = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        const newSalesman = {
            name: salesmanData.name,
            phone: salesmanData.phone,
            secondaryPhone: salesmanData.secondaryPhone,
            address: salesmanData.address,
            cnic: salesmanData.cnic,
            salary: parseFloat(salesmanData.salary) || 0,
            joiningDate: new Date(salesmanData.joiningDate),
            // Default values
            totalSales: 0,
            commissionEarned: 0,
            createdAt: new Date(),
        };
        
        const result = await db.collection(COLLECTION_NAME).insertOne(newSalesman);
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error adding salesman' }, { status: 500 });
    }
}