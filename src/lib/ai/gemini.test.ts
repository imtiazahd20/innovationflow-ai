import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BACKUP_MODEL, DEFAULT_MODEL, extractText, generateJson } from "./gemini";

const request = { system: "sys", prompt: "hello", schema: { type: "object" } };

function reply(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

function mockFetch(...responses: (Response | Error)[]) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) fn.mockRejectedValueOnce(r);
    else fn.mockResolvedValueOnce(r);
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_MODEL", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("extractText", () => {
  it("joins the text parts of the first answer", () => {
    expect(extractText({ candidates: [{ content: { parts: [{ text: '{"a":' }, { text: "1}" }] } }] })).toBe('{"a":1}');
  });

  it("removes a ```json code fence", () => {
    expect(extractText(reply('```json\n{"a":1}\n```'))).toBe('{"a":1}');
  });

  it("returns null when there is no answer", () => {
    expect(extractText({})).toBeNull();
    expect(extractText({ candidates: [] })).toBeNull();
    expect(extractText(reply("   "))).toBeNull();
  });
});

describe("generateJson", () => {
  it("does nothing without an API key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetch = mockFetch();
    expect(await generateJson(request)).toEqual({ ok: false, error: "not-configured" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the key in a header (never the URL) and parses the JSON answer", async () => {
    const fetch = mockFetch(json(reply('{"brief":"x"}')));
    const result = await generateJson(request);
    expect(result).toEqual({ ok: true, data: { brief: "x" }, model: DEFAULT_MODEL });
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toContain(`/models/${DEFAULT_MODEL}:generateContent`);
    expect(String(url)).not.toContain("test-key");
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema).toEqual({ type: "object" });
    expect(body.systemInstruction.parts[0].text).toBe("sys");
  });

  it("tries the backup model when the free quota runs out", async () => {
    const fetch = mockFetch(json({}, 429), json(reply('{"ok":true}')));
    const result = await generateJson(request);
    expect(result).toEqual({ ok: true, data: { ok: true }, model: BACKUP_MODEL });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("tries the backup model when the first is overloaded (503)", async () => {
    const fetch = mockFetch(json({ error: { message: "high demand" } }, 503), json(reply('{"ok":1}')));
    expect(await generateJson(request)).toEqual({ ok: true, data: { ok: 1 }, model: BACKUP_MODEL });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("reports quota when both models are out of free requests", async () => {
    mockFetch(json({}, 429), json({}, 429));
    expect(await generateJson(request)).toEqual({ ok: false, error: "quota" });
  });

  it("reports a network failure as unavailable", async () => {
    mockFetch(new Error("offline"), new Error("offline"));
    expect(await generateJson(request)).toEqual({ ok: false, error: "unavailable" });
  });

  it("does not retry when the answer is malformed", async () => {
    const fetch = mockFetch(json(reply("not json")));
    expect(await generateJson(request)).toEqual({ ok: false, error: "bad-response" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reports an empty or blocked answer", async () => {
    mockFetch(json({ candidates: [], promptFeedback: { blockReason: "SAFETY" } }));
    expect(await generateJson(request)).toEqual({ ok: false, error: "blocked" });
  });
});
