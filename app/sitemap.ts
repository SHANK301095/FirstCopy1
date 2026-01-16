import { festivals, products } from "@/lib/catalog";

export default function sitemap() {
  const base = "https://seasonville.example";
  const festivalUrls = festivals.map((festival) => ({
    url: `${base}/festivals/${festival.slug}`,
  }));
  const productUrls = products.map((product) => ({
    url: `${base}/products/${product.slug}`,
  }));

  return [
    { url: `${base}/` },
    { url: `${base}/collections` },
    { url: `${base}/cart` },
    { url: `${base}/checkout` },
    { url: `${base}/account` },
    ...festivalUrls,
    ...productUrls,
  ];
}
