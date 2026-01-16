export function NeedsSetupBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
      {label}: Needs Setup
    </span>
  );
}
