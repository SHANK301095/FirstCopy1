import Link from "next/link";

import { Card } from "@/components/ui/card";
import { products, festivals } from "@/lib/catalog";

export default function FestivalPage({ params }: { params: { slug: string } }) {
  const festival = festivals.find((item) => item.slug === params.slug);
  const filtered = products.filter((product) => product.festivalTags.includes(params.slug));

  if (!festival) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Festival not found</h1>
        <Link className="text-brand-700" href="/">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">{festival.name}</h1>
        <p className="mt-2 text-slate-600">{festival.hero}</p>
        <p className="mt-2 text-sm text-brand-700">Cutoffs placeholder — configure by city tier.</p>
      </div>

      <section className="space-y-4">
        <h2 className="section-title">Festival bundles</h2>
        {filtered.length === 0 ? (
          <Card className="border-dashed text-sm text-slate-600">
            No bundles yet. Add SeasonVille private-label collections here.
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <Link key={product.slug} href={`/products/${product.slug}`} className="group">
                <Card className="flex h-full flex-col transition group-hover:border-brand-500">
                  <h3 className="text-lg font-semibold text-slate-900">{product.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{product.description}</p>
                  <span className="mt-4 text-sm font-semibold text-brand-700">₹{product.price}</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
