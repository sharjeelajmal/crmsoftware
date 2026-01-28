import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

const DB_NAME = "crm_db";

export async function POST(request) {
    try {
        const { customerName, customerPhone, newTotalBalance } = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // 1. Is customer ki saari sales se mojooda balance calculate karein
        const sales = await db.collection('sales').find({ customerName, customerPhone }).toArray();
        const currentTotalBalance = sales.reduce((sum, sale) => sum + (sale.balance || 0), 0);

        // 2. Kitna balance adjust karna hai, woh calculate karein
    const adjustmentAmount = parsedTargetBalance - currentActualTotalBalance;

const currentActualTotalBalance = currentOpeningBalance + currentSalesBalance;

        // Agar balance aage peeche nahi hua to kuch na karein
        if (adjustmentAmount === 0) {
            return NextResponse.json({ message: 'No adjustment needed.' });
        }

       if (Math.abs(adjustmentAmount) < 0.01) {
            console.log("No adjustment needed as balance hasn't changed (within tolerance).");
            return NextResponse.json({ message: 'No adjustment needed.' }); // Important: Return here
        }
        
        // 3. Ek nayi "adjustment" sale banayein
   const latestSale = await db.collection('sales').find().sort({ invoiceNumber: -1 }).limit(1).toArray();
        const newInvoiceNumber = (latestSale[0]?.invoiceNumber || 0) + 1;


       
        const adjustmentSale = {
            invoiceNumber: newInvoiceNumber,
            customerName,
            customerPhone,
            items: [{ desc: `Manual Balance Adjustment`, qty: 1, price: 0 }],
            total: 0,
            subTotal: 0,
            others: 0,
            discount: 0,
            receivedAmount: -adjustmentAmount, // Agar balance kam karna hai to received positive hoga
            balance: adjustmentAmount, // Yeh اصل adjustment hai
            invoiceDate: new Date(),
        };

        await db.collection('sales').insertOne(adjustmentSale);

        return NextResponse.json({ message: 'Balance adjusted successfully!' });

    } catch (e) {
        console.error("Adjust Balance API Error:", e);
        return NextResponse.json({ error: 'Error adjusting balance' }, { status: 500 });
    }
}