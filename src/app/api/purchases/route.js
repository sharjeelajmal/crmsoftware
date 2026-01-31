import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';


const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";

// Sabhi purchases ka data get karne ke liye (Updated with Filters)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter') || 'all'; // Default to 'all'

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const now = new Date();
        let dateQuery = {};

        if (filter === 'daily') {
            dateQuery = { $gte: startOfDay(now), $lte: endOfDay(now) };
        } else if (filter === 'monthly') {
            dateQuery = { $gte: startOfMonth(now), $lte: endOfMonth(now) };
        } else if (filter === 'yearly') {
            dateQuery = { $gte: startOfYear(now), $lte: endOfYear(now) };
        }
        
        const query = Object.keys(dateQuery).length > 0 ? { purchaseDate: dateQuery } : {};

        const purchases = await db.collection('purchases').find(query).sort({ purchaseDate: -1 }).toArray();
        return NextResponse.json(purchases);
    } catch (e) {
        return NextResponse.json({ error: 'Error fetching purchases' }, { status: 500 });
    }
}

// Nayi purchase add karne ke liye (FINAL UPDATE)
export async function POST(request) {
    try {
        const purchaseData = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // 1. Purchase ko database mein save karein
        const result = await db.collection('purchases').insertOne({
            ...purchaseData,
            purchaseDate: new Date(purchaseData.purchaseDate),
            totalCost: parseFloat(purchaseData.quantity) * parseFloat(purchaseData.costPerItem),
        });

        // 2. Inventory (products collection) ko update karein
        if (result.insertedId) {
            await db.collection('products').updateOne(
                { _id: new ObjectId(purchaseData.productId) },
                { 
                    $inc: { remaining: parseInt(purchaseData.quantity, 10) }, // Stock barhayein
                    $set: { purchasePrice: parseFloat(purchaseData.costPerItem) } // Purchase price update karein
                }
            );
        }

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error adding purchase' }, { status: 500 });
    }
}