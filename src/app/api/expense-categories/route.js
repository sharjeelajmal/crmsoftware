import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

const DB_NAME = "crm_db";
const COLLECTION_NAME = "expense_categories";

// API to GET all expense categories (sorted by name)
export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const categories = await db.collection(COLLECTION_NAME).find({}).sort({ name: 1 }).toArray();
        return NextResponse.json(categories);
    } catch (e) {
        console.error("Error fetching expense categories:", e);
        return NextResponse.json({ error: 'Error fetching expense categories' }, { status: 500 });
    }
}

// API to POST a new expense category
export async function POST(request) {
    try {
        const { name } = await request.json();
        if (!name) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        // Check for duplicates
        const existing = await db.collection(COLLECTION_NAME).findOne({ name: name.trim() });
        if (existing) {
             return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
        }
        
        const result = await db.collection(COLLECTION_NAME).insertOne({ 
            name: name.trim(), 
            createdAt: new Date() 
        });
        return NextResponse.json(result);
    } catch (e) {
        console.error("Error adding expense category:", e);
        return NextResponse.json({ error: 'Error adding expense category' }, { status: 500 });
    }
}