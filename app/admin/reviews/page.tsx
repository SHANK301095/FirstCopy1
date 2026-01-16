import { Card } from "@/components/ui/card";

export default function AdminReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Reviews & Q&A</h1>
        <p className="mt-2 text-slate-600">Moderate reviews and customer questions.</p>
      </div>
      <Card className="text-sm text-slate-600">Review moderation queue placeholder.</Card>
    </div>
  );
}
