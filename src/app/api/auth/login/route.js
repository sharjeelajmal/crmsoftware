import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import bcrypt from 'bcryptjs';

const DB_NAME = process.env.MONGODB_DB;
const COLLECTION_NAME = "users";

export async function POST(request) {
    try {
        const { username, password } = await request.json();

        console.log("Login Attempt for:", username); // Terminal mein check karne ke liye

        // 1. .env se values lein
        const envUser = process.env.FIRST_USER_NAME;
        const envPass = process.env.FIRST_USER_PASS;

        console.log("Checking ENV:", envUser, envPass); // Ye terminal mein print hoga

        if (username === envUser && password === envPass) {
            console.log("Login Success via ENV");
            return NextResponse.json({ message: 'Login successful' }, { status: 200 });
        }

        // 2. Agar .env fail ho jaye to DB check karein
        const client = await clientPromise;
        const db = client.db(DB_NAME);

        const user = await db.collection(COLLECTION_NAME).findOne({
            $or: [
                { name: username.trim() },
                { email: username.trim() }
            ]
        });

        if (!user) {
            console.log("User not found in DB");
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isMatch = user.password.startsWith('$2')
            ? await bcrypt.compare(password, user.password)
            : (password === user.password);

        if (!isMatch) {
            console.log("Password did not match");
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        return NextResponse.json({ message: 'Login successful' }, { status: 200 });

    } catch (e) {
        console.error("API Error:", e.message);
        return NextResponse.json({ error: 'Login failed', details: e.message }, { status: 500 });
    }
}