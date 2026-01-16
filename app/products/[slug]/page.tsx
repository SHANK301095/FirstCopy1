import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { products } from "@/lib/catalog";

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = products.find((item) => item.slug === params.slug);

  if (!product) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Link className="text-brand-700" href="/collections">
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="p-8">
        <Link className="text-sm font-semibold text-brand-700" href="/collections">
          ← Back to collections
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{product.title}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{product.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="text-2xl font-semibold">₹{product.price}</span>
          <span className="text-sm text-slate-400 line-through">₹{product.compareAt}</span>
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">In stock</Badge>
        </div>
        <button className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-700 px-6 py-2 text-sm font-semibold text-white">
          Add to cart (placeholder)
        </button>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Ingredients & allergens</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Ingredients: {product.ingredients}</li>
            <li>Allergens: {product.allergens}</li>
            <li>Shelf life: {product.shelfLife}</li>
            <li>Storage: {product.storage}</li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Delivery promise</h2>
          <p className="mt-2 text-sm text-slate-600">
            Festival cutoffs and serviceability are pending. Configure fulfillment integrations to unlock live
            delivery windows.
          </p>
        </Card>
      </div>
    </div>
  );
}
