interface LLMClientConfig {
  apiKey: string;
  baseUrl: string;
  cheapModel?: string;
  premiumModel?: string;
  forceConfidence?: "high" | "low";
}

export interface CompleteOptions {
  tier?: "cheap" | "premium";
  schema?: object;
  systemPrompt?: string;
}

const CHEAP_MODEL_DEFAULT = "gpt-4o-mini";
const PREMIUM_MODEL_DEFAULT = "google/gemma-4-31B-it";

export class LLMClient {
  private apiKey: string;
  private baseUrl: string;
  private cheapModel: string;
  private premiumModel: string;
  /** Dev override: forces all enrichments to return this confidence level */
  public readonly forceConfidence: "high" | "low" | undefined;

  constructor(config: LLMClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.cheapModel = config.cheapModel ?? CHEAP_MODEL_DEFAULT;
    this.premiumModel = config.premiumModel ?? PREMIUM_MODEL_DEFAULT;
    this.forceConfidence = config.forceConfidence;
  }

  async complete(prompt: string, options?: CompleteOptions): Promise<string> {
    const tier = options?.tier ?? "cheap";
    const schema = options?.schema;
    const systemPrompt = options?.systemPrompt;

    const model = tier === "premium" ? this.premiumModel : this.cheapModel;

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
