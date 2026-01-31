import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";
const COLLECTION_NAME = "expense_categories";

// API to DELETE an expense category by name
export async function DELETE(request, { params }) {
    try {
        const { name } = params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        // Check if any expense is linked to this category
        const expenseCount = await db.collection('expenses').countDocuments({ category: decodeURIComponent(name) });
        
        if (expenseCount > 0) {
            return NextResponse.json({ error: `Cannot delete category "${decodeURIComponent(name)}" as it has ${expenseCount} associated expenses.` }, { status: 409 });
        }

        const result = await db.collection(COLLECTION_NAME).deleteOne({ name: decodeURIComponent(name) });
        
        if (result.deletedCount === 0) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }
        
        return NextResponse.json({ message: 'Category deleted successfully' });
    } catch (e) {
        console.error("Error deleting expense category:", e);
        return NextResponse.json({ error: 'Error deleting expense category' }, { status: 500 });
    }
}