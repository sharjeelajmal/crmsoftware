import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb'; // Path theek kar diya hai
import { ObjectId } from 'mongodb';

const DB_NAME = "crm_db"; // Database ka naam yahan likh diya hai

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const products = await db.collection('products').find({}).toArray();
        return NextResponse.json(products);
    } catch (e) {
        return NextResponse.json({ error: 'Error fetching products' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const product = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const result = await db.collection('products').insertOne(product);
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error adding product' }, { status: 500 });
    }
}