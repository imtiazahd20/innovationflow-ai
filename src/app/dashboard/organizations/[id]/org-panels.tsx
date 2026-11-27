"use client";

import { useActionState, useState, useTransition } from "react";
import { ORG_NAME_MAX, ORG_ROLES, ROLE_HINTS, ROLE_LABELS, type Member, type OrgRole } from "@/lib/orgs/roles";
import type { OrgFormState } from "./actions";

const card = "flex flex-col gap-4 rounded-2xl border-4 border-flow-ink bg-white p-5 shadow-[4px_4px_0_0_#0d0d0d]";
const input =
  "min-w-0 rounded-lg border-2 border-flow-ink bg-white px-3 py-2 text-flow-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink";
const primary =
  "rounded-lg border-2 border-flow-ink bg-flow-yellow px-4 py-2 text-sm font-black uppercase text-flow-ink shadow-[3px_3px_0_0_#0d0d0d] hover:bg-flow-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:opacity-60";
const small =
  "rounded-lg border-2 border-flow-ink px-2.5 py-1 text-xs font-black uppercase text-flow-ink hover:bg-flow-red hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flow-ink disabled:opacity-60";

type FormAction = (previous: OrgFormState, formData: FormData) => Promise<OrgFormState>;

function Feedback({ state }: { state: OrgFormState }) {
  if (state.error) return <p role="alert" className="text-sm font-medium text-red-700">{state.error}</p>;
  if (state.message) return <p role="status" className="text-sm font-medium text-flow-ink">{state.message}</p>;
  return null;
}

export function RenameForm({ name, action }: { name: string; action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="org-name" className="text-sm font-medium text-flow-ink">Workspace name</label>
      <div className="flex flex-wrap gap-2">
        <input id="org-name" name="name" defaultValue={name} maxLength={ORG_NAME_MAX} required className={`${input} flex-1`} />
        <button type="submit" disabled={pending} className={primary}>{pending ? "Saving…" : "Save name"}</button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function InviteForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [role, setRole] = useState<OrgRole>("organiser");
  return (
    <section aria-labelledby="invite-heading" className={card}>
      <h2 id="invite-heading" className="font-display text-xl font-black uppercase text-flow-ink">Invite someone</h2>
      <p className="text-sm text-zinc-800">
        They join when they sign in (or sign up) with this email address. No email is sent yet, so let them know.
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-email" className="text-sm font-medium text-flow-ink">Email</label>
          <input
            id="invite-email"
            name="email"
            type="email"
            autoComplete="off"
            required
            key={state.done ? state.message : "invite"}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-role" className="text-sm font-medium text-flow-ink">Role</label>
          <select
            id="invite-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as OrgRole)}
            aria-describedby="invite-role-hint"
            className={input}
          >
            {ORG_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <p id="invite-role-hint" className="text-sm text-zinc-700">{ROLE_HINTS[role]}</p>
        </div>
        <div>
          <button type="submit" disabled={pending} className={primary}>{pending ? "Inviting…" : "Invite"}</button>
        </div>
        <Feedback state={state} />
      </form>
    </section>
  );
}

export function MemberList({
  members,
  meId,
  canEdit,
  removeAction,
}: {
  members: Member[];
  meId: string;
  canEdit: boolean;
  removeAction: (userId: string, role: OrgRole) => Promise<OrgFormState>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(member: Member, role: OrgRole) {
    const who = member.user_id === meId ? "yourself" : member.email || "this person";
    if (!window.confirm(`Remove the ${ROLE_LABELS[role]} role from ${who}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await removeAction(member.user_id, role);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <section aria-labelledby="members-heading" className={card}>
      <h2 id="members-heading" className="font-display text-xl font-black uppercase text-flow-ink">
        Members ({members.length})
      </h2>
      {error ? <p role="alert" className="text-sm font-medium text-red-700">{error}</p> : null}
      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li key={m.user_id} className="flex flex-col gap-2 rounded-lg border-2 border-flow-ink p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0 truncate text-sm font-semibold text-flow-ink">
              {m.email || "Member"}
              {m.user_id === meId ? <span className="font-normal text-zinc-700"> (you)</span> : null}
            </span>
            <ul className="flex flex-wrap gap-1.5" aria-label={`Roles of ${m.email || "member"}`}>
              {m.roles.map((role) => (
                <li key={role} className="flex items-center gap-1 rounded-full border-2 border-flow-ink bg-flow-yellow pl-2.5 text-xs font-bold text-flow-ink">
                  <span className={canEdit ? "" : "pr-2.5"}>{ROLE_LABELS[role]}</span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => remove(m, role)}
                      disabled={pending}
                      aria-label={`Remove the ${ROLE_LABELS[role]} role from ${m.email || "this member"}`}
                      className="rounded-full px-2 py-0.5 font-black hover:bg-flow-red hover:text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-flow-ink disabled:opacity-60"
                    >
                      ×
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PendingInvites({
  invites,
  cancelAction,
}: {
  invites: { id: string; email: string; role: OrgRole }[];
  cancelAction: (inviteId: string) => Promise<void>;
}) {
  return (
    <section aria-labelledby="pending-heading" className={card}>
      <h2 id="pending-heading" className="font-display text-xl font-black uppercase text-flow-ink">
        Waiting to join ({invites.length})
      </h2>
      {invites.length === 0 ? (
        <p className="text-sm text-zinc-800">No invitations waiting.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {invites.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 border-dashed border-flow-ink p-3">
              <span className="min-w-0 truncate text-sm text-flow-ink">
                {inv.email} <span className="text-zinc-700">· {ROLE_LABELS[inv.role]}</span>
              </span>
              <form
                action={cancelAction.bind(null, inv.id)}
                onSubmit={(e) => {
                  if (!window.confirm(`Cancel the invitation for ${inv.email}?`)) e.preventDefault();
                }}
              >
                <button type="submit" aria-label={`Cancel the invitation for ${inv.email}`} className={small}>
                  Cancel
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
