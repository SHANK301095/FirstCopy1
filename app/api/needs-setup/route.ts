import { NextResponse } from "next/server";
import { needsSetupAdapters } from "../../../lib/constants";

export async function GET() {
  return NextResponse.json({
    status: "needs_setup",
    adapters: needsSetupAdapters
  });
}
