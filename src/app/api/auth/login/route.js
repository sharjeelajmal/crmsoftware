// Updated file: src/app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import bcrypt from 'bcryptjs';

const DB_NAME = "crm_db";
const COLLECTION_NAME = "users";

// Helper function to escape regex special characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export async function POST(request) {
    try {
        const { username, password } = await request.json();
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        // --- YEH HAI ASAL FIX ---
        // Username ko case-insensitive search karne ke liye regex istemal karein
        
        // Pehle spaces (trim) hatayein aur special characters ko escape karein
        const escapedUsername = escapeRegExp(username.trim()); 
        
        const user = await db.collection(COLLECTION_NAME).findOne({
            $or: [
                // $regex search karega, $options: 'i' ka matlab hai "case-insensitive"
                { name: { $regex: `^${escapedUsername}$`, $options: 'i' } },
                { email: { $regex: `^${escapedUsername}$`, $options: 'i' } }
            ]
        });
        // --- END FIX ---


        if (!user || !user.password) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        let isMatch = false;
        
        // Check karein ke password hashed hai ya plain text
        const isHashed = user.password.startsWith('$2');

        if (isHashed) {
            // Case 1: Password pehle se hashed hai (Aapka current case)
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // Case 2: Database mein plain-text password hai (Legacy flow)
            isMatch = (password === user.password);
            
            if (isMatch) {
                // Password ko "Heal" karein
                console.log("Password Healing: Plain-text password detected. Hashing and updating now...");
                const hashedNewPassword = await bcrypt.hash(password, 10);
                await db.collection(COLLECTION_NAME).updateOne(
                    { _id: user._id },
                    { $set: { password: hashedNewPassword } }
                );
            }
        }

        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Login successful
        return NextResponse.json({ message: 'Login successful' }, { status: 200 });

    } catch (e) {
        console.error("Login API Error:", e); // Error log
        return NextResponse.json({ error: 'Login failed', details: e.message }, { status: 500 });
    }
}