import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

const DB_NAME = "crm_db";
const COLLECTION_NAME = "expenses";

// API to GET all expenses, with date filtering
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get('filter') || 'all'; 

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
        } else if (filter === 'custom') {
            // --- Custom filter logic added here ---
            const from = searchParams.get('from');
            const to = searchParams.get('to');
            if (from && to) {
                dateQuery = { $gte: startOfDay(new Date(from)), $lte: endOfDay(new Date(to)) };
            }
        }
        
        const query = Object.keys(dateQuery).length > 0 ? { date: dateQuery } : {};

        const expenses = await db.collection(COLLECTION_NAME).find(query).sort({ date: -1 }).toArray();
        
        // Calculate total amount for stats
        const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
        
        return NextResponse.json({ expenses, totalAmount });
    } catch (e) {
        console.error("Error fetching expenses:", e);
        return NextResponse.json({ error: 'Error fetching expenses' }, { status: 500 });
    }
}

// API to POST a new expense
export async function POST(request) {
    try {
        const expenseData = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const newExpense = {
            ...expenseData,
            amount: parseFloat(expenseData.amount) || 0,
            date: new Date(expenseData.date),
            createdAt: new Date(),
        };

        const result = await db.collection(COLLECTION_NAME).insertOne(newExpense);
        return NextResponse.json(result);
    } catch (e) {
        console.error("Error adding expense:", e);
        return NextResponse.json({ error: 'Error adding expense' }, { status: 500 });
    }
}