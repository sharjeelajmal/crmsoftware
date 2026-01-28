import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { Parser } from 'json2csv';
import { startOfDay, endOfDay, subDays, startOfYear } from 'date-fns';

const DB_NAME = "crm_db";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter') || 'lifetime';

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const now = new Date();
        let query = {};

        // Filter ke hisab se date query banayein
        if (filter === 'today') {
            query.invoiceDate = { $gte: startOfDay(now), $lte: endOfDay(now) };
        } else if (filter === 'last7days') {
            query.invoiceDate = { $gte: startOfDay(subDays(now, 6)), $lte: endOfDay(now) };
        } else if (filter === 'thisyear') {
            query.invoiceDate = { $gte: startOfYear(now), $lte: endOfDay(now) };
        }
        // 'lifetime' ke liye koi query nahi, saara data aayega

        const sales = await db.collection('sales').find(query).sort({ invoiceDate: -1 }).toArray();

        if (sales.length === 0) {
            return NextResponse.json({ message: "No sales data found for the selected period." }, { status: 404 });
        }
        
        // Data ko user-readable format mein flat karein
        const flattenedData = [];
        sales.forEach(sale => {
            if (sale.items && sale.items.length > 0) {
                sale.items.forEach(item => {
                    flattenedData.push({
                        "Invoice #": sale.invoiceNumber,
                        "Date": new Date(sale.invoiceDate).toLocaleString(),
                        "Customer Name": sale.customerName,
                        "Customer Phone": sale.customerPhone,
                        "Item Description": item.desc,
                        "Quantity": item.qty,
                        "Price": item.price,
                        "Item Total": (item.qty || 0) * (item.price || 0),
                        "Sub Total": sale.subTotal,
                        "Discount": sale.discount,
                        "Received Amount": sale.receivedAmount,
                        "Balance": sale.balance
                    });
                });
            }
        });
        
        // JSON ko CSV mein convert karein
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(flattenedData);

        // File download ke liye headers set karein
        const headers = new Headers();
        headers.set('Content-Type', 'text/csv');
        headers.set('Content-Disposition', `attachment; filename="sales_backup_${filter}.csv"`);

        return new NextResponse(csv, { status: 200, headers });

    } catch (e) {
        console.error("Backup API Error:", e);
        return NextResponse.json({ error: 'Error creating backup' }, { status: 500 });
    }
}