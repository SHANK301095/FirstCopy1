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
