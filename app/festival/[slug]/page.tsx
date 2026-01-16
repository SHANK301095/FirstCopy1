import Link from "next/link";

import { Card } from "@/components/ui/card";
import { products } from "@/lib/catalog";

export default function FestivalPage({ params }: { params: { slug: string } }) {
  const festivalName = params.slug.replace(/-/g, " ");
  const filtered = products.filter((product) => product.festivalTags.includes(params.slug));

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold capitalize">{festivalName} gifting</h1>
        <p className="mt-2 text-slate-600">
          Seasonal bundles, gifting cutoffs, and curated categories for {festivalName}.
        </p>
        <p className="mt-2 text-sm text-brand-700">Cutoffs placeholder — configure by city tier.</p>
      </header>
      {filtered.length === 0 ? (
        <Card className="border-dashed text-sm text-slate-600">
          No bundles yet. Add SeasonVille private-label collections here.
        </Card>
      ) : (
        <section className="grid gap-6 md:grid-cols-3">
          {filtered.map((product) => (
            <Card key={product.slug} className="flex flex-col">
              <h2 className="text-lg font-semibold">{product.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{product.description}</p>
              <Link className="mt-4 inline-flex text-sm font-semibold text-brand-700" href={`/products/${product.slug}`}>
                Explore product →
              </Link>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
