import { getSetting, setSetting } from "@/lib/settings-store";

export async function GET() {
  const value = getSetting("PEAK_MODE") ?? "OFF";
  return Response.json({ key: "PEAK_MODE", value });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const value = body?.value === "ON" ? "ON" : "OFF";
    setSetting("PEAK_MODE", value);
    return Response.json({ key: "PEAK_MODE", value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 400 });
  }
}
