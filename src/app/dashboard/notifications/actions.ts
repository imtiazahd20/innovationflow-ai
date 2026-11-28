"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeAppLink } from "@/lib/time";

// The database only lets people change the read_at of their OWN notifications.
async function signedIn() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, userId: data.user.id };
}

export async function markAllRead(): Promise<void> {
  const s = await signedIn();
  if (!s) return;
  const { error } = await s.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", s.userId)
    .is("read_at", null);
  if (error) console.error("mark notifications read failed", error.code);
  revalidatePath("/", "layout");
}

export async function clearRead(): Promise<void> {
  const s = await signedIn();
  if (!s) return;
  const { error } = await s.supabase.from("notifications").delete().eq("user_id", s.userId).not("read_at", "is", null);
  if (error) console.error("clear notifications failed", error.code);
  revalidatePath("/", "layout");
}

// Opening a notification marks it read, then goes where it points (inside the app only).
export async function openNotification(id: number, link: string | null): Promise<void> {
  const s = await signedIn();
  if (s && Number.isSafeInteger(id)) {
    const { error } = await s.supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", s.userId)
      .is("read_at", null);
    if (error) console.error("mark notification read failed", error.code);
    revalidatePath("/", "layout");
  }
  redirect(safeAppLink(link) ?? "/dashboard/notifications");
}
