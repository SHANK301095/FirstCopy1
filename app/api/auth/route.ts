import { NextResponse } from "next/server";

import { logInfo } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    rateLimit("auth", { limit: 5, windowMs: 60_000 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 429;
    return NextResponse.json({ error: "Too many requests" }, { status });
  }

  logInfo("Auth placeholder invoked");
  return NextResponse.json({
    status: "needs_setup",
    message: "Auth flow placeholder. Configure session provider."
  });
}
