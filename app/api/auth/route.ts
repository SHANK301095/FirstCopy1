import { NextResponse } from "next/server";
import { checkRateLimit } from "../../../lib/rate-limit";
import { logInfo } from "../../../lib/logger";

export async function POST() {
  const rate = checkRateLimit("auth", 5, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  logInfo("Auth placeholder invoked", { remaining: rate.remaining });
  return NextResponse.json({
    status: "needs_setup",
    message: "Auth flow placeholder. Configure session provider."
  });
}
