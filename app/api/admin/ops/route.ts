import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Ops queue placeholder for FEFO and expiry alerts."
  });
}
