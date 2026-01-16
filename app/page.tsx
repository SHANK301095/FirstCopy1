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
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
