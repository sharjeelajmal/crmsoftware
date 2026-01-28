import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = "crm_db";
const COLLECTION_NAME = "salesmen";

// Salesman ko update karne ke liye
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const updatedData = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const result = await db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedData }
        );

        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error updating salesman' }, { status: 500 });
    }
}

// Salesman ko delete karne ke liye
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: 'Error deleting salesman' }, { status: 500 });
    }
}