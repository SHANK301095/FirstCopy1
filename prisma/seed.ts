import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const backlogCategories = [
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

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@seasonville.test" },
    update: {},
    create: {
      email: "admin@seasonville.test",
      name: "SeasonVille Admin",
      role: "ADMIN"
    }
  });

  await prisma.user.upsert({
    where: { email: "demo@seasonville.test" },
    update: {},
    create: {
      email: "demo@seasonville.test",
      name: "Demo Shopper",
      role: "USER",
      addresses: {
        create: {
          line1: "12 Festival Lane",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          country: "IN"
        }
      }
    }
  });

  await prisma.product.upsert({
    where: { slug: "diwali-delight-hamper" },
    update: {},
    create: {
      title: "Diwali Delight Hamper",
      slug: "diwali-delight-hamper",
      description: "SeasonVille signature hamper with sweets, dry fruits, and decor essentials.",
      productLine: "Festive Hampers",
      festivalTags: ["Diwali"],
      dietaryTags: ["Vegetarian"],
      ecoFlags: ["Reusable packaging"],
      ingredients: "Assorted dry fruits, sweets, eco-friendly decor",
      allergens: "May contain nuts",
      shelfLife: "30 days",
      storage: "Store in a cool dry place",
      images: ["/images/placeholder.jpg"],
      variants: {
        create: [
          {
            sku: "SV-DIW-001",
            name: "Standard Hamper",
            price: 2499,
            compareAt: 2999,
            stock: 120
          }
        ]
      }
    }
  });

  await prisma.setting.upsert({
    where: { key: "peakMode" },
    update: { value: "OFF" },
    create: { key: "peakMode", value: "OFF" }
  });

  const backlogSeeds = Array.from({ length: 520 }, (_, index) => {
    const id = `SV-WEB-${String(index + 1).padStart(3, "0")}`;
    return {
      id,
      title: `Backlog item ${id}`,
      category: backlogCategories[index % backlogCategories.length],
      priority: index % 3 === 0 ? "High" : index % 3 === 1 ? "Medium" : "Low"
    };
  });

  await prisma.backlogItem.createMany({ data: backlogSeeds, skipDuplicates: true });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
