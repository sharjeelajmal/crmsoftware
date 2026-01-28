import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = "crm_db";
const COLLECTION_NAME = "expenses";

// API to PUT (Update) an expense by ID
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const data = await request.json();
        
        // FIX: _id aur createdAt ko update payload se nikal dein, kyunki MongoDB in fields ko update karne ki ijazat nahi deta.
        const { _id, createdAt, ...updatedData } = data; 
        
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const fieldsToSet = {
            ...updatedData,
            amount: parseFloat(updatedData.amount) || 0,
            date: new Date(updatedData.date),
        };

        const result = await db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(id) },
            { $set: fieldsToSet }
        );
        
        if (result.matchedCount === 0) {
             return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }
        
        return NextResponse.json(result);
    } catch (e) {
        console.error("Error updating expense:", e);
        return NextResponse.json({ error: 'Error updating expense' }, { status: 500 });
    }
}

// API to DELETE an expense by ID
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'Expense deleted successfully' });
    } catch (e) {
        console.error("Error deleting expense:", e);
        return NextResponse.json({ error: 'Error deleting expense' }, { status: 500 });
    }
}