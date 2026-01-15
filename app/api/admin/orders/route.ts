import { NextResponse } from "next/server";
import { orderStatusSchema } from "../../../../lib/validation";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = orderStatusSchema.safeParse(body?.status);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  return NextResponse.json({ status: "ok", updatedStatus: parsed.data });
}
