import { Card } from "@/components/ui/card";

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Products & Variants</h1>
        <p className="mt-2 text-slate-600">CRUD for products, tags, ingredients, and variant pricing.</p>
      </div>
      <Card className="border-dashed text-sm text-slate-600">
        Add product, variants, and images placeholders.
      </Card>
    </div>
  );
}
