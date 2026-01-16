import { Card } from "@/components/ui/card";

export default function AdminExperimentsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Experiments</h1>
        <p className="mt-2 text-slate-600">Feature flags and A/B tests.</p>
      </div>
      <Card className="text-sm text-slate-600">Experiments table placeholder.</Card>
    </div>
  );
}
