import Link from "next/link";
import { festivals, productCategories } from "../lib/constants";
import { mockProducts, trustBadges } from "../lib/mock-data";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-white p-10 shadow-sm">
        <div className="flex flex-col gap-6">
          <span className="text-sm font-semibold uppercase text-brand-700">Festival-first private label</span>
          <h1 className="text-4xl font-semibold text-slate-900">
            SeasonVille Money Printer — premium festive gifting for India.
          </h1>
          <p className="text-lg text-slate-600">
            Build curated hampers, wellness kits, and seasonal essentials with SeasonVille-branded packaging and
            fulfillment.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link className="rounded-full bg-brand-700 px-6 py-2 text-white" href="/collections">
              Shop by season
            </Link>
            <Link className="rounded-full border border-slate-200 px-6 py-2 text-slate-700" href="/festival/diwali">
              Explore Diwali
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Trust layer</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {trustBadges.map((badge) => (
            <div key={badge} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium">
              {badge}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Shop by season & festival</h2>
        <div className="flex flex-wrap gap-3">
          {festivals.slice(0, 12).map((festival) => (
            <Link
              key={festival}
              href={`/festival/${festival.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
            >
              {festival}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Featured bundles</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {mockProducts.map((product) => (
            <div key={product.slug} className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>{product.festival}</span>
                <span className="text-brand-700">Save ₹{product.compareAt - product.price}</span>
              </div>
              <h3 className="mt-3 text-lg font-semibold">{product.title}</h3>
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
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title">Private label categories</h2>
        <div className="grid gap-4 md:grid-cols-5">
          {productCategories.map((category) => (
            <div key={category} className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm">
              {category}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
