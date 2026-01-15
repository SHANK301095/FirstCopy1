import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.peakMode) {
    return NextResponse.json({ error: "peakMode required" }, { status: 400 });
  }

  return NextResponse.json({ status: "ok", peakMode: body.peakMode });
}
