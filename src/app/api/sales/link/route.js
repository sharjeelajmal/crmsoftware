import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";

export async function POST(request) {
    try {
        const { invoiceNumber, salesmanId } = await request.json();

        if (!invoiceNumber || !salesmanId) {
            return NextResponse.json({ error: 'Invoice number and salesman ID are required.' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // 1. Find the sale by invoice number
        const sale = await db.collection('sales').findOne({ invoiceNumber: parseInt(invoiceNumber) });

        if (!sale) {
            return NextResponse.json({ error: 'Sale with this invoice number not found.' }, { status: 404 });
        }

        if (sale.salesmanId) {
            return NextResponse.json({ error: 'This sale is already assigned to another salesman.' }, { status: 409 });
        }

        // 2. Update the sale with the salesman ID
        await db.collection('sales').updateOne(
            { _id: sale._id },
            { $set: { salesmanId: salesmanId } }
        );

        // 3. Update the salesman's total sales
        await db.collection('salesmen').updateOne(
            { _id: new ObjectId(salesmanId) },
            { $inc: { totalSales: sale.subTotal } } // Increment totalSales by the sale amount
        );

        return NextResponse.json({ message: 'Sale linked successfully!' });

    } catch (e) {
        console.error("Link Sale API Error:", e);
        return NextResponse.json({ error: 'Error linking sale.' }, { status: 500 });
    }
}