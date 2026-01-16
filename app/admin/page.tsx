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
  );
}
