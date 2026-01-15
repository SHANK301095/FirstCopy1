import { NextResponse } from "next/server";
import { productSchema } from "../../../../lib/validation";
import { logInfo } from "../../../../lib/logger";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  logInfo("Product create placeholder", { slug: parsed.data.slug });
  return NextResponse.json({ status: "ok", product: parsed.data });
}
