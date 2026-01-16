import Link from "next/link";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/collections", label: "Collections" },
  { href: "/festivals/diwali", label: "Diwali" },
  { href: "/cart", label: "Cart" },
  { href: "/account", label: "Account" },
  { href: "/admin", label: "Admin" }
];

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
        <Link href="/" className="text-xl font-semibold text-brand-700">
          SeasonVille
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-700">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-brand-700">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
