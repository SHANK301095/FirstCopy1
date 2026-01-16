import { Card } from "@/components/ui/card";

export default function AdminOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Orders</h1>
        <p className="mt-2 text-slate-600">Track and update fulfillment status.</p>
      </div>
      <Card className="text-sm text-slate-600">Orders list placeholder with status update controls.</Card>
    </div>
  );
}
