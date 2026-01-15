import { NextResponse } from "next/server";
import { serviceabilitySchema } from "../../../../lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = serviceabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({ status: "ok", serviceability: parsed.data });
}
