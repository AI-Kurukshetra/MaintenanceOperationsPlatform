import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Generate PM Work Orders Placeholder" });
}
