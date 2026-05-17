import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This route is not implemented (frontend reads backend directly)." },
    { status: 501 }
  );
}

