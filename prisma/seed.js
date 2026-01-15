const fs = require("fs");

const categories = [
  "Discovery",
  "Product Page",
  "Checkout",
  "Shipping",
  "Accounts",
  "Content/SEO",
  "Ops/QC/Inventory",
  "Admin/Analytics",
  "Security/Performance",
];

const rows = [];
for (let i = 1; i <= 520; i += 1) {
  const id = `SV-WEB-${String(i).padStart(3, "0")}`;
  const category = categories[(i - 1) % categories.length];
  const priority = i % 3 === 0 ? "P1" : i % 3 === 1 ? "P2" : "P3";
  rows.push(`${id},${category},${priority},Backlog item ${i}`);
}

fs.writeFileSync(
  "./backlog.csv",
  ["id,category,priority,title", ...rows].join("\n"),
  "utf8"
);

console.log("Seed placeholders generated: backlog.csv");
