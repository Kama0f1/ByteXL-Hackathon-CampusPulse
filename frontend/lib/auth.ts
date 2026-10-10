/**
 * DEMO AUTHENTICATION ONLY.
 *
 * CampusPulse has no real user accounts yet. Signing in sets a cookie that marks the
 * browser as a demo faculty session; no password is checked and nothing is stored.
 * Replace this with real authentication before using real student data.
 */
export const SESSION_COOKIE = "campuspulse_demo_session";

/** Eight hours, roughly one working day. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export const DEMO_ACCOUNT = {
  name: "Demo Faculty",
  email: "faculty@campuspulse.demo",
  password: "demo1234",
  role: "Faculty mentor",
} as const;

/** App pages that require a demo session. Keep in sync with the `(app)` route group. */
export const PROTECTED_PATHS = ["/dashboard", "/students", "/risks", "/segments", "/interventions", "/data", "/alerts"];

export const DEFAULT_AFTER_LOGIN = "/dashboard";

/** Only allow redirects to protected in-app paths, never to other sites. */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AFTER_LOGIN;
  }
  const isProtected = PROTECTED_PATHS.some((path) => value === path || value.startsWith(`${path}/`));
  return isProtected ? value : DEFAULT_AFTER_LOGIN;
}
