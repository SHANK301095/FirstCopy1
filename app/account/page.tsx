export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Account</h1>
        <p className="mt-2 text-slate-600">Profile, saved addresses, and order history.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <p className="mt-2 text-sm text-slate-600">Demo order list placeholder.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Addresses</h2>
          <p className="mt-2 text-sm text-slate-600">Add or edit shipping addresses.</p>
        </div>
      </div>
    </div>
  );
}
