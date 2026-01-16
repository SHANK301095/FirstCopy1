import { Card } from "@/components/ui/card";

export default function AdminServiceabilityPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Serviceability & Cutoffs</h1>
        <p className="mt-2 text-slate-600">Manage pincode serviceability and festival cutoffs.</p>
      </div>
      <Card className="text-sm text-slate-600">Serviceability table and cutoff rule editor placeholder.</Card>
    </div>
  );
}
