import { needsSetupAdapters } from "../../lib/constants";

export default function CheckoutPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Checkout</h1>
        <p className="mt-2 text-slate-600">Address management and order creation placeholder.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Shipping address</h2>
          <p className="mt-2 text-sm text-slate-600">Select or add an address (demo placeholders).</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Payment</h2>
          <p className="mt-2 text-sm text-slate-600">Payment adapter placeholder.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {needsSetupAdapters[0].providers.map((provider) => (
              <li key={provider} className="flex items-center justify-between">
                <span>{provider}</span>
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Needs Setup</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
