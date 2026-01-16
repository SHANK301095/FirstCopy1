"use client";

import Link from "next/link";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialItems = [
  { id: "festival-sweet-box", name: "SeasonVille Festive Sweet Box", price: 1299, qty: 1 }
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
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Your cart</h1>
        <p className="mt-2 text-slate-600">Cart state is stored in session for MVP.</p>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed text-sm text-slate-600">
          Cart is empty. <Link className="font-semibold text-brand-700" href="/collections">Continue shopping</Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{item.name}</h2>
                <p className="text-sm text-slate-600">₹{item.price}</p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  value={item.qty}
                  onChange={(event) => updateQty(item.id, Number(event.target.value))}
                  className="w-20"
                />
                <span className="text-sm font-semibold text-slate-700">₹{item.price * item.qty}</span>
              </div>
            </Card>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <p className="text-sm text-slate-600">Estimated total</p>
              <p className="text-xl font-semibold">₹{total}</p>
            </div>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-brand-700 px-6 py-2 text-sm font-semibold text-white"
              href="/checkout"
            >
              Proceed to checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
