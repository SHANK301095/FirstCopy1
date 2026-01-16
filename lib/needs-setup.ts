const integrations = {
  payments: ["RAZORPAY_KEY", "STRIPE_KEY"],
  courier: ["COURIER_API_KEY"],
  whatsapp: ["WHATSAPP_API_KEY"],
  email: ["EMAIL_API_KEY"],
};

export function integrationStatus(key: keyof typeof integrations) {
  const required = integrations[key];
  const ready = required.some((env) => Boolean(process.env[env]));
  return {
    ready,
    label: ready ? "Ready" : "Needs Setup",
  };
}
