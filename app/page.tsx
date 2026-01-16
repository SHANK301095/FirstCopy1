import Link from "next/link";

import { NeedsSetupBadge } from "@/components/NeedsSetupBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { festivals, productCategories, seasonalMoments, products, trustBadges } from "@/lib/catalog";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-white p-8 shadow-sm sm:p-12">
        <div className="flex flex-col gap-6">
          <span className="text-sm font-semibold uppercase text-brand-700">Festival-first private label</span>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
            SeasonVille — premium festive gifting for India.
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Build curated hampers, wellness kits, and seasonal essentials with SeasonVille-branded packaging and
            fulfillment.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700/90"
              href="/collections"
            >
              Shop by season
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href="/festivals/diwali"
            >
              Explore Diwali
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            <NeedsSetupBadge label="Payments" />
            <NeedsSetupBadge label="Courier" />
            <NeedsSetupBadge label="WhatsApp" />
            <NeedsSetupBadge label="Email" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Trust layer</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustBadges.map((badge) => (
            <Card key={badge} className="p-4 text-sm font-medium">
              {badge}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Shop by festival</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((festival) => (
            <Link key={festival.slug} href={`/festivals/${festival.slug}`} className="group">
              <Card className="h-full transition group-hover:border-brand-500">
                <h3 className="text-lg font-semibold text-slate-900">{festival.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{festival.hero}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="section-title">Featured bundles</h2>
          <Link className="text-sm font-semibold text-brand-700" href="/collections">
            View all collections →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.slug} className="flex h-full flex-col">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span className="capitalize">{product.festivalTags[0]}</span>
                <span className="text-brand-700">Save ₹{product.compareAt - product.price}</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-slate-900">{product.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{product.description}</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-lg font-semibold">₹{product.price}</span>
                <span className="text-sm text-slate-400 line-through">₹{product.compareAt}</span>
              </div>
              <Link
                className="mt-4 inline-flex items-center text-sm font-semibold text-brand-700"
                href={`/products/${product.slug}`}
              >
                View product →
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Seasonal moments</h2>
        <div className="flex flex-wrap gap-2">
          {seasonalMoments.map((moment) => (
            <Badge key={moment}>{moment}</Badge>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Private label categories</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {productCategories.map((category) => (
            <Card key={category} className="border-dashed p-4 text-sm">
              {category}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
