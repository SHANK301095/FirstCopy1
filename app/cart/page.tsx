"use client";

import Link from "next/link";
import { useState } from "react";

const initialItems = [
  { id: "festival-sweet-box", name: "SeasonVille Festive Sweet Box", price: 1299, qty: 1 },
];

export default function CartPage() {
  const [items, setItems] = useState(initialItems);

  const updateQty = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty: Math.max(qty, 0) } : item))
    );
  };

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Your cart</h1>
      {items.length === 0 ? (
        <p>
          Cart is empty. <Link href="/collections">Continue shopping</Link>
        </p>
      ) : (
        <div>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "1rem 0",
                borderBottom: "1px solid #efe2d5",
              }}
            >
              <div>
                <strong>{item.name}</strong>
                <p>₹{item.price}</p>
              </div>
              <input
                type="number"
                min={0}
                value={item.qty}
                onChange={(event) => updateQty(item.id, Number(event.target.value))}
                style={{ width: 60 }}
              />
            </div>
          ))}
          <div style={{ marginTop: "1rem", fontWeight: 600 }}>Total: ₹{total}</div>
          <Link href="/checkout" style={{ display: "inline-block", marginTop: "1rem" }}>
            Proceed to checkout
          </Link>
        </div>
      )}
    </main>
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
