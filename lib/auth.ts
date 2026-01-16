export type Session = {
  userId: string;
  role: "USER" | "ADMIN";
};

export function getSession(): Session {
  return {
    userId: "demo-user",
    role: "ADMIN"
  };
}

export function requireAdmin(session: Session) {
  if (session.role !== "ADMIN") {
    throw new Error("Admin access required");
  }
}
