import { Card } from "@/components/ui/card";

export default function AdminOpsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Ops: Batch & FEFO</h1>
        <p className="mt-2 text-slate-600">Batch tracking, FEFO queue, expiry alerts.</p>
      </div>
      <Card className="text-sm text-slate-600">FEFO dispatch queue and expiry alerts placeholder.</Card>
    </div>
  );
}
