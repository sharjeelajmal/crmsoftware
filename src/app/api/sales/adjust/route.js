import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";

export async function POST(request) {
    try {
        const { customerName, customerPhone, newTotalBalance: targetTotalBalance } = await request.json(); // Rename for clarity

        // Ensure targetTotalBalance is a valid number
        const parsedTargetBalance = parseFloat(targetTotalBalance);
        if (isNaN(parsedTargetBalance)) {
             return NextResponse.json({ error: 'Invalid new total balance provided.' }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // --- Calculate Current Actual Balance ---
        // 1. Check if the customer is registered
        const registeredCustomer = await db.collection('customers').findOne({ name: customerName, phone: customerPhone });
        
        let currentOpeningBalance = 0;
        if (registeredCustomer) {
            currentOpeningBalance = registeredCustomer.openingBalance || 0;
        }

        // 2. Get all sales balance for the customer
        const sales = await db.collection('sales').find({ customerName, customerPhone }).toArray();
        const currentSalesBalance = sales.reduce((sum, sale) => sum + (sale.balance || 0), 0);
        
        // 3. Calculate current total balance
const currentActualTotalBalance = currentOpeningBalance + currentSalesBalance;
        // --- End Calculation ---


        // Kitna balance adjust karna hai, woh calculate karein
        const adjustmentAmount = parsedTargetBalance - currentActualTotalBalance;

        // Agar balance aage peeche nahi hua to kuch na karein
       if (adjustmentAmount === 0) {
            console.log("No adjustment needed as balance hasn't changed.");
            return NextResponse.json({ message: 'No adjustment needed.' }); // Important: Return here
        }
        if (Math.abs(adjustmentAmount) < 0.01) {
            console.log("No adjustment needed as balance hasn't changed (within tolerance).");
            return NextResponse.json({ message: 'No adjustment needed.' }); // Important: Return here
        }

        // Ek nayi "adjustment" sale banayein
       const latestSale = await db.collection('sales').find().sort({ invoiceNumber: -1 }).limit(1).toArray();
        const newInvoiceNumber = (latestSale[0]?.invoiceNumber || 0) + 1;

        const adjustmentSale = {
            invoiceNumber: newInvoiceNumber,
            customerName,
            customerPhone,
            items: [{ desc: `Manual Balance Adjustment`, qty: 1, price: 0 }], // Description change kiya
            total: 0,
            subTotal: 0, // Adjustment sales ka subtotal 0 hota hai
            others: 0,
            discount: 0,
            receivedAmount: -adjustmentAmount, // Agar balance barhana hai (+ve adjust), received -ve hoga. Agar kam karna hai (-ve adjust), received +ve hoga.
            balance: adjustmentAmount, // Balance field mein sirf difference store hoga
            invoiceDate: new Date(),
            isAdjustment: true // Flag add kar diya (optional, future use ke liye)
        };

        await db.collection('sales').insertOne(adjustmentSale);

        return NextResponse.json({ message: 'Balance adjusted successfully!' });

    } catch (e) {
        console.error("Adjust Balance API Error:", e);
        return NextResponse.json({ error: 'Error adjusting balance' }, { status: 500 });
    }
}