export const needsSetupAdapters = [
  { key: "payments", label: "Payments", providers: ["Razorpay", "Stripe"] },
  { key: "courier", label: "Courier", providers: ["Shiprocket", "Delhivery"] },
  { key: "whatsapp", label: "WhatsApp", providers: ["WATI", "Twilio"] },
  { key: "email", label: "Email", providers: ["SES", "Resend"] }
];
