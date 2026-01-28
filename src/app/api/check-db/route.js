import clientPromise from "../../../../lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // clientPromise is a promise that resolves to a MongoDB client
    const client = await clientPromise;
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    return NextResponse.json({ message: "Successfully connected to MongoDB!" }, { status: 200 });
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    return NextResponse.json({ message: "Failed to connect to MongoDB", error: error.message }, { status: 500 });
  }
}