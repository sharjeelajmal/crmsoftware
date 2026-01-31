import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const salesCount = await db.collection('sales').countDocuments();
        const customersCount = await db.collection('customers').countDocuments();
        const productsCount = await db.collection('products').countDocuments();
        const categoriesCount = await db.collection('categories').countDocuments();
        const salesmenCount = await db.collection('salesmen').countDocuments();

        const stats = [
            { name: 'Sales', count: salesCount },
            { name: 'Customers', count: customersCount },
            { name: 'Products', count: productsCount },
            { name: 'Categories', count: categoriesCount },
            { name: 'Salesmen', count: salesmenCount },
        ];

        return NextResponse.json(stats);
    } catch (e) {
        console.error("Backup Stats API Error:", e);
        return NextResponse.json({ error: 'Error fetching backup stats' }, { status: 500 });
    }
}