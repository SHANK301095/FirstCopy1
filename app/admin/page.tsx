import Link from "next/link";

const adminLinks = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/backlog", label: "Backlog 520" },
  { href: "/admin/settings", label: "Peak Mode" },
  { href: "/admin/serviceability", label: "Serviceability" },
  { href: "/admin/ops", label: "Ops" },
  { href: "/admin/reviews", label: "Reviews & Q&A" },
  { href: "/admin/loyalty", label: "Loyalty" },
  { href: "/admin/experiments", label: "Experiments" }
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Admin Console</h1>
        <p className="mt-2 text-slate-600">Role-based admin tools for SeasonVille operations.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-2xl border border-slate-200 bg-white p-5">
            <span className="text-sm font-semibold text-slate-800">{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
