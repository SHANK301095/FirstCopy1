/**
 * Phase 3: CSRF Origin Validation
 * Validates request origins to prevent cross-site request forgery
 */

const ALLOWED_ORIGINS = [
  'https://mmc3010.lovable.app',
  'https://id-preview--9585abe7-4b28-4e9d-87d4-d095da7c3d10.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

/** Check if the current page origin is trusted */
export function isOriginTrusted(origin?: string): boolean {
  const currentOrigin = origin ?? window.location.origin;
  return ALLOWED_ORIGINS.some(allowed => currentOrigin.startsWith(allowed));
}

/** Generate a CSRF token and store in sessionStorage */
export function generateCSRFToken(): string {
  const token = crypto.randomUUID?.() ?? `csrf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('mmc-csrf-token', token);
  return token;
}

/** Validate a CSRF token */
export function validateCSRFToken(token: string): boolean {
  const stored = sessionStorage.getItem('mmc-csrf-token');
  return !!stored && stored === token;
}

/** Get current CSRF token */
export function getCSRFToken(): string {
  let token = sessionStorage.getItem('mmc-csrf-token');
  if (!token) {
    token = generateCSRFToken();
  }
  return token;
}
