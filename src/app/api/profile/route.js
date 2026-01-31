// Updated file: src/app/api/profile/route.js

import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs'; // Import bcrypt

const DB_NAME = process.env.MONGODB_DB || "crm-software-copy";
const COLLECTION_NAME = "users";

// Helper function to get the single user profile
async function getProfile(db) {
    let user = await db.collection(COLLECTION_NAME).findOne({});
    
    // Default password (use env var or fallback)
    const defaultPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    if (!user) {
        // Case 1: Koi user nahi hai. Naya banayein.
        const defaultUser = {
            name: 'Mr. Denum',
            email: 'contact@mrdenum.com',
            phone: '+92 300 1234567',
            avatar: '/logo.png',
            role: 'Administrator',
            password: hashedPassword // Hashed password save karein
        };
        const result = await db.collection(COLLECTION_NAME).insertOne(defaultUser);
        user = { ...defaultUser, _id: result.insertedId };
    
    // --- *** YEH HAI ASAL FIX *** ---
    // Check karein ke password field mojood nahi hai YA woh plain text hai (hashed nahi hai)
    } else if (!user.password || !user.password.startsWith('$2')) {
        // Case 2: User hai, lekin password nahi hai YA password plain text hai.
        // Zabardasti password ko default (admin123) par reset kar dein.
        
        console.log("User password missing or is plain-text. Forcing reset to default password...");
        await db.collection(COLLECTION_NAME).updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword } }
        );
        user.password = hashedPassword; // Taake response mein use ho sake
    // --- *** END FIX *** ---
    }
    
    return user;
}

// Profile data get karne ke liye
export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        const user = await getProfile(db);
        
        // Password ko frontend par mat bhejain
        const { password, ...userWithoutPassword } = user;
        
        return NextResponse.json(userWithoutPassword);
    } catch (e) {
        console.error("GET Profile API Error:", e); // Behtar logging
        return NextResponse.json({ error: 'Error fetching profile' }, { status: 500 });
    }
}

// Profile data update karne ke liye
export async function PUT(request) {
    try {
        const updatedData = await request.json();
        // Password ko is route se update hone se rokein
        delete updatedData.password; 
        
        const client = await clientPromise;
        const db = client.db(DB_NAME);
        
        // Pehle user get karein (taake ban jaye agar nahi hai)
        const user = await getProfile(db);

        const result = await db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(user._id) },
            { $set: updatedData }
        );

        return NextResponse.json({ message: 'Profile updated successfully!', data: result });
    } catch (e) {
        console.error("PUT Profile API Error:", e); // Behtar logging
        return NextResponse.json({ error: 'Error updating profile' }, { status: 500 });
    }
}