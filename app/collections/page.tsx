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
  );
}
