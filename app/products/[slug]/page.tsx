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
  );
}
