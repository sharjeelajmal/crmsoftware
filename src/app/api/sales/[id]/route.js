import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = "crm_db";

// 1. GET Single Sale (View ke liye) - Yeh waisa hi rahega
export async function GET(request, { params }) {
    try {
        const { id } = params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const sale = await db.collection('sales').findOne({ _id: new ObjectId(id) });
        
        if (!sale) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }
        return NextResponse.json(sale);
    } catch (e) {
        return NextResponse.json({ error: 'Error fetching sale' }, { status: 500 });
    }
}

// 2. PUT Function (Edit Invoice - NEW FEATURE)
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const updatedSaleData = await request.json(); // Naya data jo user ne edit kiya
        
        // Date fix karein
        if (updatedSaleData.invoiceDate) {
            updatedSaleData.invoiceDate = new Date(updatedSaleData.invoiceDate);
        }
        // _id field ko update mein se nikaal dein taake crash na ho
        delete updatedSaleData._id;

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // Step A: Purani Sale dhoondain
        const oldSale = await db.collection('sales').findOne({ _id: new ObjectId(id) });
        if (!oldSale) {
            return NextResponse.json({ error: 'Original sale not found' }, { status: 404 });
        }

        // Step B: PURANA STOCK WAPAS ADD KAREIN (Revert Inventory)
        // Jo cheezein pehle bechi thin, unka stock wapas inventory mein daal dein
        if (oldSale.items && oldSale.items.length > 0) {
            const revertStockPromises = oldSale.items
                .filter(item => item.desc && parseInt(item.qty, 10) > 0)
                .map(item => {
                    return db.collection('products').updateOne(
                        { name: item.desc },
                        { $inc: { remaining: parseInt(item.qty, 10) } } // Stock wapas add ho raha hai (+)
                    );
                });
            await Promise.all(revertStockPromises);
        }

        // Step C: NAYA STOCK MINUS KAREIN (Apply New Inventory)
        // Jo ab naye items edit karke dale hain, unka stock kaat lein
        if (updatedSaleData.items && updatedSaleData.items.length > 0) {
            const newStockPromises = updatedSaleData.items
                .filter(item => item.desc && parseInt(item.qty, 10) > 0)
                .map(item => {
                    return db.collection('products').updateOne(
                        { name: item.desc },
                        { $inc: { remaining: -parseInt(item.qty, 10) } } // Stock minus ho raha hai (-)
                    );
                });
            await Promise.all(newStockPromises);
        }

        // Step D: Sale Document Update Karein
        const result = await db.collection('sales').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedSaleData }
        );

        return NextResponse.json({ message: 'Sale updated and inventory adjusted successfully', result });

    } catch (e) {
        console.error("Update Sale Error:", e);
        return NextResponse.json({ error: 'Error updating sale' }, { status: 500 });
    }
}

// 3. DELETE Function (Updated - Ab yeh stock bhi wapas karega)
export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // Step A: Sale delete karne se pehle usay dhoondain
        const saleToDelete = await db.collection('sales').findOne({ _id: new ObjectId(id) });

        if (!saleToDelete) {
            return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
        }

        // Step B: INVENTORY WAPAS KAREIN (Restore Stock)
        // Agar sale delete ho rahi hai, to maal wapas dukaan mein aajana chahiye
        if (saleToDelete.items && saleToDelete.items.length > 0) {
            const restoreStockPromises = saleToDelete.items
                .filter(item => item.desc && parseInt(item.qty, 10) > 0)
                .map(item => {
                    return db.collection('products').updateOne(
                        { name: item.desc },
                        { $inc: { remaining: parseInt(item.qty, 10) } } // Stock wapas add (+)
                    );
                });
            await Promise.all(restoreStockPromises);
        }

        // Step C: Ab Sale Delete Karein
        const result = await db.collection('sales').deleteOne({ _id: new ObjectId(id) });

        return NextResponse.json({ message: 'Sale deleted and inventory restored successfully' });
    } catch (e) {
        console.error("Delete Sale Error:", e);
        return NextResponse.json({ error: 'Error deleting sale' }, { status: 500 });
    }
}