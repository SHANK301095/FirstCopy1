import { Card } from "@/components/ui/card";

export default function AdminBacklogPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Backlog 520</h1>
        <p className="mt-2 text-slate-600">SV-WEB-001 to SV-WEB-520 seeded in database.</p>
      </div>
      <Card className="text-sm text-slate-600">
        Backlog table placeholder (ID, category, priority, status).
      </Card>
    </div>
  );
}
