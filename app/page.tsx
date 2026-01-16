import Link from "next/link";

import { NeedsSetupBadge } from "@/components/NeedsSetupBadge";
import { festivals, productCategories, seasonalMoments, products } from "@/lib/catalog";

export default function HomePage() {
  return (
    <main>
      <section style={{ padding: "3rem", background: "#fdf6f0" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
          SeasonVille
        </h1>
        <p style={{ maxWidth: 640 }}>
          Premium private-label festival gifting for India. Built for seasonal
          spikes with QC, sealed packs, and delight-first unboxing.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <NeedsSetupBadge label="Payments" />
          <NeedsSetupBadge label="Courier" />
          <NeedsSetupBadge label="WhatsApp" />
          <NeedsSetupBadge label="Email" />
        </div>
      </section>

      <section style={{ padding: "2rem 3rem" }}>
        <h2>Shop by festival</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {festivals.map((festival) => (
            <Link
              key={festival.slug}
              href={`/festivals/${festival.slug}`}
              style={{
                border: "1px solid #f0e7db",
                borderRadius: 12,
                padding: "1rem",
                textDecoration: "none",
                color: "inherit",
                background: "#fff",
              }}
            >
              <strong>{festival.name}</strong>
              <p style={{ fontSize: "0.9rem", color: "#6b6b6b" }}>
                {festival.hero}
              </p>
            </Link>
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

      <section style={{ padding: "0 3rem 2rem" }}>
        <h2>Featured private label picks</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          {products.map((product) => (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              style={{
                border: "1px solid #efe2d5",
                borderRadius: 12,
                padding: "1rem",
                background: "#fff",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <strong>{product.title}</strong>
              <p style={{ margin: "0.5rem 0", color: "#6b6b6b" }}>{product.description}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>₹{product.price}</span>
                <span style={{ textDecoration: "line-through", color: "#b0b0b0" }}>
                  ₹{product.compareAt}
                </span>
              </div>
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

      <section style={{ padding: "0 3rem 2rem" }}>
        <h2>Gift categories</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {productCategories.map((category) => (
            <span
              key={category}
              style={{
                padding: "0.4rem 0.75rem",
                borderRadius: 999,
                border: "1px solid #eadfd2",
                background: "#fff",
              }}
            >
              {category}
            </span>
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

      <section style={{ padding: "0 3rem 3rem" }}>
        <h2>Seasonal moments</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
          {seasonalMoments.map((moment) => (
            <div
              key={moment}
              style={{
                border: "1px dashed #f0e7db",
                borderRadius: 12,
                padding: "1rem",
                background: "#fffdf9",
              }}
            >
              {moment}
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
    </main>
    </div>
  );
}
