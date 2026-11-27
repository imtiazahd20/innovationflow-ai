import type { ChallengeField, ChallengeFieldErrors } from "@/lib/validation/challenge";

// What a challenge form gets back after a try. "values" lets the form keep what was typed.
export type ChallengeFormState = {
  error?: string;
  fieldErrors?: ChallengeFieldErrors;
  values?: Partial<Record<ChallengeField, string>>;
  // The workspace picked on the "new challenge" form, kept after a failed try.
  organizationId?: string;
};

// A challenge as stored in the database (the columns the pages need).
export type Challenge = {
  id: string;
  title: string;
  business_problem: string;
  objectives: string;
  target_participants: string;
  deadline: string;
  status: string;
  created_at: string;
  updated_at: string;
};

// The signature every challenge form action has, so one form can create or edit.
export type ChallengeFormAction = (
  previous: ChallengeFormState,
  formData: FormData,
) => Promise<ChallengeFormState>;
