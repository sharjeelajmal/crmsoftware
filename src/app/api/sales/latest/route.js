import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        // Find the latest sale by sorting by invoiceNumber in descending order
        const latestSale = await db.collection('sales').find().sort({ invoiceNumber: -1 }).limit(1).toArray();
        if (latestSale.length > 0) {
            return NextResponse.json({ latestInvoiceNumber: latestSale[0].invoiceNumber });
        } else {
            return NextResponse.json({ latestInvoiceNumber: 0 }); // If no sales exist yet
        }
    } catch (e) {
        return NextResponse.json({ error: 'Error fetching latest invoice number' }, { status: 500 });
    }
}