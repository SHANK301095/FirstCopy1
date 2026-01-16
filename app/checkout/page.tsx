import { NeedsSetupBadge } from "@/components/NeedsSetupBadge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { needsSetupAdapters } from "@/lib/constants";

export default function CheckoutPage() {
  const payment = needsSetupAdapters.find((adapter) => adapter.key === "payments");
  const courier = needsSetupAdapters.find((adapter) => adapter.key === "courier");

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <p className="mt-2 text-slate-600">Address management and order creation placeholder.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Shipping address</h2>
          <p className="mt-2 text-sm text-slate-600">Select or add an address (demo placeholders).</p>
          <form className="mt-4 grid gap-3">
            <Input placeholder="Full name" />
            <Input placeholder="Email" />
            <Input placeholder="Phone" />
            <Input placeholder="Address line" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="City" />
              <Input placeholder="State" />
            </div>
            <Input placeholder="Pincode" />
            <button
              className="mt-2 inline-flex items-center justify-center rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white"
              type="button"
            >
              Save address (placeholder)
            </button>
          </form>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Payment</h2>
          <p className="mt-2 text-sm text-slate-600">Payment adapter placeholder.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <NeedsSetupBadge label="Payments" />
            <NeedsSetupBadge label="Courier" />
          </div>
          {payment ? (
            <ul className="mt-4 space-y-2 text-sm">
              {payment.providers.map((provider) => (
                <li key={provider} className="flex items-center justify-between">
                  <span>{provider}</span>
                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Needs Setup</span>
                </li>
              ))}
            </ul>
          ) : null}
          {courier ? (
            <div className="mt-6">
              <p className="text-sm font-semibold text-slate-700">Courier options (Needs Setup)</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {courier.providers.map((provider) => (
                  <li key={provider}>{provider}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
