// Which pages need a logged-in user, and where to send people who are in the wrong place.
// Kept as plain functions with no framework code so they are easy to test.

// Any page under these paths requires login. Add new private areas here.
export const PROTECTED_PREFIXES = ["/dashboard"];

// Pages that make no sense once you are logged in.
export const AUTH_PAGES = ["/login"];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => matchesPrefix(pathname, page));
}

// Returns the path to redirect to, or null when the visitor may stay where they are.
export function redirectTargetFor(
  pathname: string,
  isLoggedIn: boolean,
): string | null {
  if (!isLoggedIn && isProtectedPath(pathname)) return "/login";
  if (isLoggedIn && isAuthPage(pathname)) return "/dashboard";
  return null;
}
