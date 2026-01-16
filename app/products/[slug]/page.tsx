import Link from "next/link";
import { products } from "@/lib/catalog";

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = products.find((item) => item.slug === params.slug);

  if (!product) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Product not found</h1>
        <Link href="/collections">Back to collections</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <Link href="/collections">← Back to collections</Link>
      <h1 style={{ marginTop: "1rem" }}>{product.title}</h1>
      <p style={{ maxWidth: 640 }}>{product.description}</p>
      <div style={{ display: "flex", gap: "1rem", margin: "1rem 0" }}>
        <span style={{ fontSize: "1.4rem", fontWeight: 600 }}>₹{product.price}</span>
        <span style={{ textDecoration: "line-through", color: "#b0b0b0", marginTop: "0.3rem" }}>
          ₹{product.compareAt}
        </span>
      </div>
      <p>Stock: {product.stock} units</p>
      <button style={{ padding: "0.6rem 1.2rem", borderRadius: 8, border: "1px solid #d6c8b6" }}>
        Add to cart (placeholder)
      </button>
      <section style={{ marginTop: "2rem" }}>
        <h2>Ingredients & details</h2>
        <ul>
          <li>Ingredients: {product.ingredients}</li>
          <li>Allergens: {product.allergens}</li>
          <li>Shelf life: {product.shelfLife}</li>
          <li>Storage: {product.storage}</li>
        </ul>
      </section>
    </main>
import { mockProducts } from "../../../lib/mock-data";

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = mockProducts.find((item) => item.slug === params.slug) ?? mockProducts[0];
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">{product.title}</h1>
        <p className="mt-2 text-slate-600">{product.description}</p>
        <div className="mt-4 flex items-center gap-4">
          <span className="text-2xl font-semibold">₹{product.price}</span>
          <span className="text-sm text-slate-400 line-through">₹{product.compareAt}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">In stock</span>
        </div>
        <button className="mt-6 rounded-full bg-brand-700 px-6 py-2 text-white">Add to cart</button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Ingredients & allergens</h2>
          <p className="mt-2 text-sm text-slate-600">Placeholder for ingredients, allergens, shelf life.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Delivery promise</h2>
          <p className="mt-2 text-sm text-slate-600">Configured by festival cutoffs and serviceability.</p>
        </div>
      </div>
    </div>
  );
}
