import { Suspense } from "react";
import { redirect } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { safeAppLink, timeAgo } from "@/lib/time";
import { clearRead, markAllRead, openNotification } from "./actions";

export const metadata = { title: `Notifications · ${APP_NAME}` };

const button =
  "rounded-lg border-2 border-flow-ink bg-white px-3 py-1.5 text-xs font-black uppercase text-flow-ink hover:bg-flow-yellow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink";

export default function NotificationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl border-2 border-flow-ink bg-flow-yellow" aria-hidden />}>
        <NotificationsContent />
      </Suspense>
    </main>
  );
}

async function NotificationsContent() {
  const supabase = await createClient();
  if (!supabase) {
    return <p className="rounded-xl border-2 border-flow-ink bg-flow-yellow p-5 text-flow-ink">The database isn&apos;t connected yet.</p>;
  }
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/login");

  // The database only returns this person's own notifications.
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) console.error("load notifications failed", error.code);
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at).length;
  const read = items.length - unread;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-flow-red">Inbox</p>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight text-flow-ink">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-800">
            {unread === 0 ? "You're all caught up." : `${unread} unread`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unread > 0 ? (
            <form action={markAllRead}>
              <button type="submit" className={button}>Mark all as read</button>
            </form>
          ) : null}
          {read > 0 ? (
            <form action={clearRead}>
              <button type="submit" className={button}>Clear read</button>
            </form>
          ) : null}
        </div>
      </header>

      {error ? (
        <p role="alert" className="rounded-lg border-2 border-flow-ink bg-flow-red px-4 py-3 text-sm text-white">
          We couldn&apos;t load your notifications. Reload the page to try again.
        </p>
      ) : items.length === 0 ? (
        <section className="rounded-xl border-4 border-dashed border-flow-ink bg-white px-6 py-12 text-center">
          <h2 className="font-display text-lg font-black uppercase text-flow-ink">Nothing yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-800">
            You&apos;ll be told here when a new idea arrives for your challenges or someone joins your workspace.
          </p>
        </section>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <form action={openNotification.bind(null, n.id, safeAppLink(n.link))}>
                <button
                  type="submit"
                  className={`flex w-full items-start justify-between gap-3 rounded-xl border-2 border-flow-ink p-4 text-left transition-colors hover:bg-flow-yellow/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink ${
                    n.read_at ? "bg-white" : "bg-flow-yellow shadow-[3px_3px_0_0_#0d0d0d]"
                  }`}
                >
                  <span className="min-w-0">
                    {!n.read_at ? <span className="sr-only">Unread: </span> : null}
                    <span className={`block text-sm text-flow-ink ${n.read_at ? "" : "font-bold"}`}>{n.title}</span>
                    <span className="mt-0.5 block text-xs text-zinc-700">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read_at ? <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-flow-red" /> : null}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
