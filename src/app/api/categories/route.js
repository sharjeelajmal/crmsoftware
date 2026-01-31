import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb'; // Path theek kar diya hai

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const categories = await db.collection('categories').find({}).toArray();
        return NextResponse.json(categories);
    } catch (e) {
        return NextResponse.json({ error: 'Error fetching categories' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { name } = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const result = await db.collection('categories').insertOne({ name });
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error adding category' }, { status: 500 });
    }
}