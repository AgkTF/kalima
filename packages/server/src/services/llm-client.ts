interface LLMClientConfig {
  apiKey: string;
  baseUrl: string;
  cheapModel?: string;
}

export interface CompleteOptions {
  tier?: "cheap" | "premium";
  schema?: object;
  systemPrompt?: string;
}

const CHEAP_MODEL_DEFAULT = "gpt-4o-mini";

export class LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private cheapModel: string;

  constructor(config: LLMClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.cheapModel = config.cheapModel ?? CHEAP_MODEL_DEFAULT;
  }

  async complete(prompt: string, options?: CompleteOptions): Promise<string> {
    const tier = options?.tier ?? "cheap";
    const schema = options?.schema;
    const systemPrompt = options?.systemPrompt;

    const model = tier === "premium" ? this.cheapModel : this.cheapModel; // premium not implemented yet

    const messages: { role: string; content: string }[] = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const body: Record<string, unknown> = {
      model,
      messages,
    };

    if (schema) {
      body.response_format = {
        type: "json_schema",
        json_schema: {
          name: "response",
          strict: true,
          schema,
        },
      };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `LLM API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    return data.choices[0].message.content;
  }
}
