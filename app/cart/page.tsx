export default function CartPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Your cart</h1>
        <p className="mt-2 text-slate-600">Cart state is stored in session for MVP.</p>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
        Empty cart state — add a product to continue checkout.
      </div>
    </div>
  );
}
