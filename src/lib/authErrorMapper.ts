/**
 * Auth Error Mapper
 * Maps Supabase auth errors to user-friendly messages
 * Includes leaked password detection
 */

export interface AuthErrorMapping {
  message: string;
  field?: 'email' | 'password' | 'general';
}

/**
 * Map Supabase auth error to user-friendly message
 */
export function mapAuthError(error: string | null | undefined): AuthErrorMapping {
  if (!error) {
    return { message: 'An unexpected error occurred. Please try again.', field: 'general' };
  }

  const lowerError = error.toLowerCase();

  // Leaked/breached password detection (HaveIBeenPwned integration)
  if (
    lowerError.includes('leaked') ||
    lowerError.includes('pwned') ||
    lowerError.includes('breach') ||
    lowerError.includes('compromised') ||
    lowerError.includes('exposed in data')
  ) {
    return {
      message: 'This password appears in known data breaches. Please choose a different, stronger password.',
      field: 'password',
    };
  }

  // Already registered
  if (lowerError.includes('already registered') || lowerError.includes('already exists')) {
    return {
      message: 'An account with this email already exists. Try signing in instead.',
      field: 'email',
    };
  }

  // Invalid credentials
  if (lowerError.includes('invalid login credentials') || lowerError.includes('invalid credentials')) {
    return {
      message: 'Invalid email or password. Please check and try again.',
      field: 'general',
    };
  }

  // Email not confirmed
  if (lowerError.includes('email not confirmed') || lowerError.includes('confirm your email')) {
    return {
      message: 'Please check your email to confirm your account before signing in.',
      field: 'email',
    };
  }

  // Too many requests / rate limiting
  if (lowerError.includes('too many requests') || lowerError.includes('rate limit')) {
    return {
      message: 'Too many attempts. Please wait a few minutes and try again.',
      field: 'general',
    };
  }

  // Weak password
  if (lowerError.includes('password') && (lowerError.includes('weak') || lowerError.includes('short') || lowerError.includes('minimum'))) {
    return {
      message: 'Password is too weak. Use at least 6 characters with letters and numbers.',
      field: 'password',
    };
  }

  // Invalid email format
  if (lowerError.includes('invalid email') || lowerError.includes('email format')) {
    return {
      message: 'Please enter a valid email address.',
      field: 'email',
    };
  }

  // User not found
  if (lowerError.includes('user not found') || lowerError.includes('no user')) {
    return {
      message: 'No account found with this email. Would you like to sign up?',
      field: 'email',
    };
  }

  // Network/connection errors
  if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('fetch')) {
    return {
      message: 'Unable to connect to server. Try: disable ad blocker/VPN, use incognito mode, or clear browser cache.',
      field: 'general',
    };
  }

  // Default fallback
  return {
    message: 'Sign up failed. Please try again.',
    field: 'general',
  };
}

/**
 * Check if error is a leaked password error
 */
export function isLeakedPasswordError(error: string | null | undefined): boolean {
  if (!error) return false;
  const lowerError = error.toLowerCase();
  return (
    lowerError.includes('leaked') ||
    lowerError.includes('pwned') ||
    lowerError.includes('breach') ||
    lowerError.includes('compromised') ||
    lowerError.includes('exposed in data')
  );
}
