import fs from "node:fs";

const categories = [
  "Discovery",
  "Product Page",
  "Checkout",
  "Shipping",
  "Accounts",
  "Content/SEO",
  "Ops/QC/Inventory",
  "Admin/Analytics",
  "Security/Performance"
];

const rows = Array.from({ length: 520 }, (_, index) => {
  const id = `SV-WEB-${String(index + 1).padStart(3, "0")}`;
  const category = categories[index % categories.length];
  const priority = index % 3 === 0 ? "High" : index % 3 === 1 ? "Medium" : "Low";
  return `${id},Backlog item ${id},${category},${priority}`;
});

const header = "id,title,category,priority";
fs.writeFileSync("backlog.csv", [header, ...rows].join("\n"));
console.log("Generated backlog.csv");
