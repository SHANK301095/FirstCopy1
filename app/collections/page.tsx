import Link from "next/link";
import { products } from "@/lib/catalog";

const filters = ["festival", "dietary", "price", "gifting"];

export default function CollectionsPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>All Collections</h1>
      <p>Browse private-label products across festivals and seasons.</p>
      <section style={{ display: "flex", gap: "0.5rem", margin: "1rem 0" }}>
        {filters.map((filter) => (
          <span
            key={filter}
            style={{
              border: "1px solid #e9ddcf",
              padding: "0.3rem 0.6rem",
              borderRadius: 999,
              fontSize: "0.85rem",
            }}
          >
            {filter}
          </span>
        ))}
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {products.map((product) => (
          <Link
            key={product.slug}
            href={`/products/${product.slug}`}
            style={{
              border: "1px solid #f0e7db",
              borderRadius: 12,
              padding: "1rem",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <strong>{product.title}</strong>
            <p style={{ color: "#6b6b6b" }}>{product.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>₹{product.price}</span>
              <span style={{ textDecoration: "line-through", color: "#b0b0b0" }}>
                ₹{product.compareAt}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
import { mockProducts } from "../../lib/mock-data";

export default function CollectionsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">All collections</h1>
        <p className="mt-2 text-slate-600">Filter by festival, dietary, gifting, price, or eco tags.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {mockProducts.map((product) => (
          <div key={product.slug} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">{product.festival}</div>
            <h2 className="mt-2 text-lg font-semibold">{product.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{product.description}</p>
            <div className="mt-4 text-sm font-semibold text-brand-700">₹{product.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
