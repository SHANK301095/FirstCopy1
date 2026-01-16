import { orderSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  rateLimit("checkout", { limit: 10, windowMs: 60_000 });
  const payload = await request.json();
  const result = orderSchema.safeParse(payload);

  if (!result.success) {
    return Response.json({ error: result.error.flatten() }, { status: 400 });
  }

  return Response.json({
    status: "created",
    message: "Order created (placeholder).",
  });
}
