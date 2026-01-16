import { z } from "zod";

export const productSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().min(10),
});

export const orderSchema = z.object({
  email: z.string().email(),
  address: z.string().min(5),
});
