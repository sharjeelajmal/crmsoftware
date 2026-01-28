import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb'; // Path theek kar diya hai
import { ObjectId } from 'mongodb';

const DB_NAME = "crm_db";

export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const { remaining } = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        const result = await db.collection('products').updateOne(
            { _id: new ObjectId(id) },
            { $set: { remaining: remaining } }
        );

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error updating product' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const result = await db.collection('products').deleteOne({ _id: new ObjectId(id) });
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error deleting product' }, { status: 500 });
    }
}