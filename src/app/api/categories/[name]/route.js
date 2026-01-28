import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb'; // Path theek kar diya hai

const DB_NAME = "crm_db";

export async function DELETE(request, { params }) {
    try {
        const { name } = params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const result = await db.collection('categories').deleteOne({ name: decodeURIComponent(name) });
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error deleting category' }, { status: 500 });
    }
}