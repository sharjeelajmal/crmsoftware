import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

const DB_NAME = "crm_db";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const customerName = searchParams.get('customerName');
        const salesmanId = searchParams.get('salesmanId');

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        let query = {};
        if (customerName) {
            query.customerName = { $regex: `^${customerName.trim()}$`, $options: 'i' };
        }
        if (salesmanId) {
            query.salesmanId = salesmanId;
        }

        const sales = await db.collection('sales').find(query).sort({ invoiceDate: -1 }).toArray();

        return NextResponse.json(sales);
    } catch (e) {
        return NextResponse.json({ error: 'Error fetching sales' }, { status: 500 });
    }
}

// --- POST FUNCTION (FINAL UPDATE) ---
export async function POST(request) {
    try {
        const sale = await request.json();
        // Date ko string se Date object mein convert karein
        sale.invoiceDate = new Date(sale.invoiceDate);

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // 1. Sale ko database mein save karein
        const result = await db.collection('sales').insertOne(sale);

        // 2. Inventory ko alag se update karein, taake sale save hone mein masla na ho
        if (result.insertedId && sale.items && sale.items.length > 0) {
            try {
                const productUpdates = sale.items
                    .filter(item => item.desc && parseInt(item.qty, 10) > 0) // Sirf valid items ko process karein
                    .map(item => {
                        return db.collection('products').updateOne(
                            { name: item.desc },
                            { $inc: { remaining: -parseInt(item.qty, 10) } }
                        );
                    });
                
                await Promise.all(productUpdates);
            } catch (inventoryError) {
                // Agar inventory update mein koi masla aaye, to usko console par log kar dein
                // Sale pehle hi save ho chuki hai
                console.error("Inventory update failed, but sale was saved:", inventoryError);
            }
        }

        return NextResponse.json(result);
    } catch (e) {
        console.error("Error adding sale:", e);
        return NextResponse.json({ error: 'Error adding sale' }, { status: 500 });
    }
}