// "5 minutes ago", "yesterday", "3 Nov 2026": how activity and notifications show their time.

import { formatDate } from "./format";

export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return "";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(then.toISOString().slice(0, 10));
}

// Only links inside this app are followed, so a stored link can never send someone elsewhere.
export function safeAppLink(link: string | null | undefined): string | null {
  if (typeof link !== "string" || !link.startsWith("/") || link.startsWith("//") || link.startsWith("/\\")) {
    return null;
  }
  return link;
}
