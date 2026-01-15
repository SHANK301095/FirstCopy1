import { z } from "zod";

export const productSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().min(10),
  productLine: z.string().min(2),
  festivalTags: z.array(z.string()).default([]),
  dietaryTags: z.array(z.string()).default([]),
  ecoFlags: z.array(z.string()).default([])
});

export const orderStatusSchema = z.enum(["NEW", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]);

export const serviceabilitySchema = z.object({
  pincode: z.string().min(6).max(6),
  city: z.string().min(2),
  state: z.string().min(2),
  tier: z.enum(["METRO", "TIER1", "TIER2", "TIER3"]).default("TIER2")
});
