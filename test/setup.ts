/**
 * Global test setup, loaded via vitest.config.ts `setupFiles`.
 *
 * `baseSessionOptions` in lib/auth/session.ts reads IRON_SESSION_PASSWORD at
 * MODULE LOAD time, into a const. Setting it inside a test file would be too
 * late whenever the module graph pulled that module in first, which is exactly
 * the kind of ordering dependency that makes a suite pass alone and fail in a
 * batch. A setup file runs before any test module is imported, so the value is
 * always in place.
 *
 * This is a throwaway value for tests only; it never leaves this process.
 */
process.env.IRON_SESSION_PASSWORD ??= "test-only-iron-session-password-32-chars-min";
