import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

const DB_NAME = "crm_db";
const COLLECTION_NAME = "vendors";

// Sabhi vendors ka data get karne ke liye
export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const vendors = await db.collection(COLLECTION_NAME).find({}).sort({ name: 1 }).toArray();
        return NextResponse.json(vendors);
    } catch (e) {
        return NextResponse.json({ error: 'Error fetching vendors' }, { status: 500 });
    }
}

// Naya vendor add karne ke liye
export async function POST(request) {
    try {
        const vendorData = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const result = await db.collection(COLLECTION_NAME).insertOne({ ...vendorData, createdAt: new Date() });
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error adding vendor' }, { status: 500 });
    }
}