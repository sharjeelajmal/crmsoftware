import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";

// Function to delete a purchase by its ID
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // 1. Find the purchase to be deleted to get its details
        const purchaseToDelete = await db.collection('purchases').findOne({ _id: new ObjectId(id) });

        if (!purchaseToDelete) {
            return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
        }

        // 2. Delete the purchase record
        const deleteResult = await db.collection('purchases').deleteOne({ _id: new ObjectId(id) });

        if (deleteResult.deletedCount > 0) {
            // 3. If deletion was successful, update the corresponding product's inventory
            await db.collection('products').updateOne(
                { _id: new ObjectId(purchaseToDelete.productId) },
                { 
                    // Decrease the 'remaining' stock by the quantity of the deleted purchase
                    $inc: { remaining: -parseInt(purchaseToDelete.quantity, 10) }
                }
            );
        }

        return NextResponse.json({ message: 'Purchase deleted and inventory updated successfully.' });
    } catch (e) {
        console.error("Error deleting purchase:", e);
        return NextResponse.json({ error: 'Error deleting purchase' }, { status: 500 });
    }
}