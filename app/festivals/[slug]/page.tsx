import Link from "next/link";
import { festivals, products } from "@/lib/catalog";

export default function FestivalPage({ params }: { params: { slug: string } }) {
  const festival = festivals.find((item) => item.slug === params.slug);
  const filtered = products.filter((product) => product.festivalTags.includes(params.slug));

  if (!festival) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Festival not found</h1>
        <Link href="/">Back to home</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{festival.name}</h1>
      <p>{festival.hero}</p>
      <section style={{ marginTop: "2rem" }}>
        <h2>Festival bundles</h2>
        {filtered.length === 0 ? (
          <p>No bundles yet. Add SeasonVille private-label collections here.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {filtered.map((product) => (
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
                <span>₹{product.price}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
