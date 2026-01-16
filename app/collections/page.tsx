import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { products } from "@/lib/catalog";

const filters = ["Festival", "Dietary", "Price", "Gifting", "Eco"];

export default function CollectionsPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">All collections</h1>
        <p className="mt-2 text-slate-600">Filter by festival, dietary, gifting, price, or eco tags.</p>
      </div>

      <section className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Badge key={filter}>{filter}</Badge>
        ))}
      </section>

      {products.length === 0 ? (
        <Card className="border-dashed text-sm text-slate-600">No collections available yet.</Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Link key={product.slug} href={`/products/${product.slug}`} className="group">
              <Card className="flex h-full flex-col transition group-hover:border-brand-500">
                <div className="text-sm text-slate-500 capitalize">{product.festivalTags[0]}</div>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">{product.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{product.description}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-lg font-semibold">₹{product.price}</span>
                  <span className="text-sm text-slate-400 line-through">₹{product.compareAt}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
