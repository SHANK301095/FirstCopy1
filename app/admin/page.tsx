import fs from "fs";
import path from "path";

import { integrationStatus } from "@/lib/needs-setup";

function loadBacklog() {
  const filePath = path.join(process.cwd(), "backlog.csv");
  const content = fs.readFileSync(filePath, "utf8");
  const [header, ...rows] = content.split("\n");
  return rows.slice(0, 12).map((row) => {
    const [id, category, priority, title] = row.split(",");
    return { id, category, priority, title };
  });
}

export default function AdminPage() {
  const backlog = loadBacklog();
  const payments = integrationStatus("payments");
  const courier = integrationStatus("courier");

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Admin Console</h1>
      <section style={{ marginTop: "1rem" }}>
        <h2>Operations status</h2>
        <ul>
          <li>Payments: {payments.label}</li>
          <li>Courier: {courier.label}</li>
          <li>Peak mode: OFF (placeholder)</li>
        </ul>
      </section>
      <section style={{ marginTop: "1rem" }}>
        <h2>Backlog preview</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>ID</th>
              <th style={{ textAlign: "left" }}>Category</th>
              <th style={{ textAlign: "left" }}>Priority</th>
              <th style={{ textAlign: "left" }}>Title</th>
            </tr>
          </thead>
          <tbody>
            {backlog.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.category}</td>
                <td>{item.priority}</td>
                <td>{item.title}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
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
