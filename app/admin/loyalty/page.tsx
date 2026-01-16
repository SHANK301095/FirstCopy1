import { Card } from "@/components/ui/card";

export default function AdminLoyaltyPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Loyalty & Referrals</h1>
        <p className="mt-2 text-slate-600">Points ledger, tiers, and referral tracking.</p>
      </div>
      <Card className="text-sm text-slate-600">Loyalty ledger and referral table placeholder.</Card>
    </div>
  );
}
