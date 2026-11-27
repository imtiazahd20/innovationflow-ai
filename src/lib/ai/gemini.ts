// Talks to Google's Gemini API (free tier) and asks for an answer shaped like a JSON
// schema. Only server code may import this file: it reads GEMINI_API_KEY, which must
// never reach the browser (so it must NOT start with NEXT_PUBLIC_).
//
// Free-tier note: Google may use what is sent on the free tier to improve its products,
// so only the challenge text the owner typed is sent, never personal data.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Both are free-tier models. The second is a lighter backup with more generous limits,
// used when the first is busy or out of free quota.
export const DEFAULT_MODEL = "gemini-3.6-flash";
export const BACKUP_MODEL = "gemini-3.5-flash-lite";

// A full plan draft took about 27 seconds on the free tier when tested, so allow a minute.
const TIMEOUT_MS = 55_000;

export type GeminiError =
  | "not-configured" // no API key set
  | "quota" // free limit reached (HTTP 429)
  | "blocked" // Gemini refused to answer, or the answer was empty
  | "bad-response" // the answer wasn't valid JSON
  | "unavailable"; // network problem, timeout, or Gemini error

export type GeminiResult = { ok: true; data: unknown; model: string } | { ok: false; error: GeminiError };

type Request = {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
};

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateJson(request: Request): Promise<GeminiResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return { ok: false, error: "not-configured" };

  const preferred = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const models = preferred === BACKUP_MODEL ? [preferred] : [preferred, BACKUP_MODEL];

  let last: GeminiResult = { ok: false, error: "unavailable" };
  for (const model of models) {
    last = await callModel(model, key, request);
    // Only switch to the backup model when the first one is busy, out of quota or missing.
    // A refusal or a malformed answer would most likely repeat, so we stop there.
    if (last.ok || (last.error !== "quota" && last.error !== "unavailable")) return last;
  }
  return last;
}

async function callModel(model: string, key: string, request: Request): Promise<GeminiResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: "user", parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: 0.7,
          // Tested against the live API: these two fields return JSON matching the schema.
          responseMimeType: "application/json",
          responseJsonSchema: request.schema,
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    console.error("gemini request failed", model, error instanceof Error ? error.name : "unknown");
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 429) return { ok: false, error: "quota" };
  // 503 = "model experiencing high demand": reported as unavailable so the backup model is tried.
  if (!response.ok) {
    // Log only the status: the body can echo the prompt back.
    console.error("gemini error status", model, response.status);
    return { ok: false, error: "unavailable" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: "bad-response" };
  }

  const text = extractText(body);
  if (!text) return { ok: false, error: "blocked" };
  try {
    return { ok: true, data: JSON.parse(text), model };
  } catch {
    return { ok: false, error: "bad-response" };
  }
}

// Pulls the answer text out of Gemini's reply: candidates[0].content.parts[*].text.
export function extractText(body: unknown): string | null {
  const candidates = (body as { candidates?: unknown })?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((p) => (typeof (p as { text?: unknown })?.text === "string" ? (p as { text: string }).text : ""))
    .join("")
    .trim();
  return text === "" ? null : stripCodeFence(text);
}

// Some models wrap JSON in ```json ... ``` even when asked not to.
function stripCodeFence(text: string): string {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text);
  return match ? match[1] : text;
}
