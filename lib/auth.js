export const Roles = Object.freeze({
  USER: "USER",
  ADMIN: "ADMIN",
});

export function requireRole(user, role) {
  if (!user || user.role !== role) {
    const error = new Error("Unauthorized");
    error.status = 403;
    throw error;
  }
}
