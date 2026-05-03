import { describe, expect, it, vi, afterEach } from "vitest";
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
    expect(body.messages).toEqual([
      { role: "user", content: "say hello" },
    ]);
    expect(body.model).toBeDefined();
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
        schema,
      },
    });
  });
});