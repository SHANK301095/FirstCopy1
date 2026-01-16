import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-slate-600">The page you are looking for does not exist.</p>
      <Link className="text-sm font-semibold text-brand-700" href="/">
        Back to home
      </Link>
    </div>
  );
}
