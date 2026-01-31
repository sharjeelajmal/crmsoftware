import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";
const COLLECTION_NAME = "users";

export async function POST(request) {
    try {
        const { currentPassword, newPassword } = await request.json();
        
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const user = await db.collection(COLLECTION_NAME).findOne({});
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // --- YEH FIX HAI ---
        // Check karein ke password field database mein mojood hai ya nahi
        if (!user.password) {
            console.error("User document in database is missing the 'password' field.");
            // User ko saaf error bhejein
            return NextResponse.json({ error: 'Password data is missing. Cannot compare.' }, { status: 400 });
        }
        // --- END FIX ---

        // 1. Current password check karein
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return NextResponse.json({ error: 'Current password does not match' }, { status: 400 });
        }

        // 2. Naya password hash karein
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 3. Database mein update karein
        await db.collection(COLLECTION_NAME).updateOne(
            { _id: user._id }, 
            { $set: { password: hashedNewPassword } }
        );

        return NextResponse.json({ message: 'Password updated successfully!' }, { status: 200 });

    } catch (e) {
        console.error("Change Password API Error:", e); // Error log add karein
        return NextResponse.json({ error: 'Error updating password', details: e.message }, { status: 500 });
    }
}