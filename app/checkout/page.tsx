import { NeedsSetupBadge } from "@/components/NeedsSetupBadge";

export default function CheckoutPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Checkout</h1>
      <p>Complete delivery details to place your order.</p>
      <form style={{ display: "grid", gap: "0.75rem", maxWidth: 420 }}>
        <input placeholder="Full name" />
        <input placeholder="Email" />
        <input placeholder="Phone" />
        <input placeholder="Address line" />
        <input placeholder="City" />
        <input placeholder="State" />
        <input placeholder="Pincode" />
        <button type="submit">Place order (placeholder)</button>
      </form>
      <section style={{ marginTop: "2rem" }}>
        <h2>Payment status</h2>
        <NeedsSetupBadge label="Payments" />
      </section>
    </main>
  );
}
