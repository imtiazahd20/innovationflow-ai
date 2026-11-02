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

// The address of a single challenge in the private area: /dashboard/challenges/<id>.
// People often copy this address from the browser bar and share it, so visitors who are
// not signed in are sent to the public page for that challenge instead of the login page.
const CHALLENGE_URL = /^\/dashboard\/challenges\/([0-9a-fA-F-]{36})\/?$/;

export function publicPathFor(pathname: string): string | null {
  const match = CHALLENGE_URL.exec(pathname);
  return match ? `/c/${match[1]}` : null;
}

// Returns the path to redirect to, or null when the visitor may stay where they are.
export function redirectTargetFor(
  pathname: string,
  isLoggedIn: boolean,
): string | null {
  if (!isLoggedIn) {
    const publicPath = publicPathFor(pathname);
    if (publicPath) return publicPath;
    if (isProtectedPath(pathname)) return "/login";
  }
  if (isLoggedIn && isAuthPage(pathname)) return "/dashboard";
  return null;
}
