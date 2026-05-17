import { afterEach, describe, expect, it, vi } from "vitest";
import { LLMClient } from "../services/llm-client.js";

describe("LLMClient.complete", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends prompt to OpenAI-compatible API and returns completion text", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "hello world" } }],
        }),
    });

    const client = new LLMClient({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
    });

    const result = await client.complete("say hello");

    expect(result).toBe("hello world");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.test.com/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.messages).toEqual([{ role: "user", content: "say hello" }]);
    expect(body.model).toBeDefined();
  });

  it("uses premium model when tier is 'premium'", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "premium result" } }],
        }),
    });

    const client = new LLMClient({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      cheapModel: "gpt-4o-mini",
      premiumModel: "gpt-4o",
    });

    await client.complete("complex prompt", { tier: "premium" });

    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.model).toBe("gpt-4o");
  });

  it("falls back to cheapModel when tier is not specified", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "cheap result" } }],
        }),
    });

    const client = new LLMClient({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      cheapModel: "gpt-4o-mini",
    });

    await client.complete("simple prompt");

    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.model).toBe("gpt-4o-mini");
  });

  it("uses cheapModel when tier is 'cheap'", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: "cheap explicit" } }],
        }),
    });

    const client = new LLMClient({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
      cheapModel: "gpt-4o-mini",
      premiumModel: "gpt-4o",
    });

    await client.complete("simple prompt", { tier: "cheap" });

    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.model).toBe("gpt-4o-mini");
  });

  it("sends response_format with json_schema when schema provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [{ message: { content: '{"item":"test"}' } }],
        }),
    });

    const client = new LLMClient({
      apiKey: "test-key",
      baseUrl: "https://api.test.com/v1",
    });

    const schema = {
      type: "object",
      properties: {
        item: { type: "string" },
      },
      required: ["item"],
    };

    await client.complete("extract item", { schema });

    const body = JSON.parse(
      (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
    );
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: {
        name: "response",
        strict: true,
        schema,
      },
    });
  });
});
