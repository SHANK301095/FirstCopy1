import { Card } from "@/components/ui/card";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Peak Mode</h1>
        <p className="mt-2 text-slate-600">Toggle festival peak mode stored in settings table.</p>
      </div>
      <Card className="text-sm text-slate-600">Peak Mode toggle placeholder (ON/OFF).</Card>
    </div>
  );
}
