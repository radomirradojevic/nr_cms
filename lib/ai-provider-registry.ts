import { type AIProviderId } from "@/lib/global-settings";

export interface AIProvider {
  generateCompletion(prompt: string, context: string): Promise<string>;
}

export type AIProviderConfig = {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  timeoutMs?: number;
};

type AIProviderConstructor = new (config: AIProviderConfig) => AIProvider;

class AIProviderRequestError extends Error {
  constructor(
    provider: string,
    readonly status: number,
    readonly data: unknown,
  ) {
    super(`${provider} request failed with status ${status}`);
    this.name = "AIProviderRequestError";
  }
}

abstract class HttpAIProvider implements AIProvider {
  protected constructor(
    protected readonly providerName: string,
    protected readonly config: AIProviderConfig,
  ) {}

  abstract generateCompletion(prompt: string, context: string): Promise<string>;

  protected buildPrompt(prompt: string, context: string): string {
    const trimmedContext = context.trim();
    return trimmedContext ? `${trimmedContext}\n\n${prompt}` : prompt;
  }

  protected async postJson(url: string, init: RequestInit): Promise<unknown> {
    const response = await fetch(url, {
      ...init,
      method: "POST",
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 15_000),
    });
    const data = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      throw new AIProviderRequestError(
        this.providerName,
        response.status,
        data,
      );
    }

    return data;
  }
}

export class OpenAIProvider extends HttpAIProvider {
  constructor(config: AIProviderConfig) {
    super("OpenAI", config);
  }

  async generateCompletion(prompt: string, context: string): Promise<string> {
    const data = await this.postJson("https://api.openai.com/v1/responses", {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        input: this.buildPrompt(prompt, context),
        max_output_tokens: this.config.maxOutputTokens,
        store: false,
      }),
    });

    return extractOpenAIOutputText(data);
  }
}

export class AnthropicProvider extends HttpAIProvider {
  constructor(config: AIProviderConfig) {
    super("Anthropic", config);
  }

  async generateCompletion(prompt: string, context: string): Promise<string> {
    const data = await this.postJson("https://api.anthropic.com/v1/messages", {
      headers: {
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxOutputTokens,
        messages: [
          {
            role: "user",
            content: this.buildPrompt(prompt, context),
          },
        ],
      }),
    });

    return extractAnthropicOutputText(data);
  }
}

export class GoogleProvider extends HttpAIProvider {
  constructor(config: AIProviderConfig) {
    super("Google", config);
  }

  async generateCompletion(prompt: string, context: string): Promise<string> {
    const model = encodeURIComponent(this.config.model);
    const key = encodeURIComponent(this.config.apiKey);
    const data = await this.postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: this.buildPrompt(prompt, context) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: this.config.maxOutputTokens,
          },
        }),
      },
    );

    return extractGoogleOutputText(data);
  }
}

export class MistralProvider extends HttpAIProvider {
  constructor(config: AIProviderConfig) {
    super("Mistral", config);
  }

  async generateCompletion(prompt: string, context: string): Promise<string> {
    const data = await this.postJson(
      "https://api.mistral.ai/v1/chat/completions",
      {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: "user",
              content: this.buildPrompt(prompt, context),
            },
          ],
          max_tokens: this.config.maxOutputTokens,
        }),
      },
    );

    return extractChatCompletionText(data);
  }
}

export class XAIProvider extends HttpAIProvider {
  constructor(config: AIProviderConfig) {
    super("xAI", config);
  }

  async generateCompletion(prompt: string, context: string): Promise<string> {
    const data = await this.postJson("https://api.x.ai/v1/chat/completions", {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "user",
            content: this.buildPrompt(prompt, context),
          },
        ],
        max_tokens: this.config.maxOutputTokens,
      }),
    });

    return extractChatCompletionText(data);
  }
}

export const AI_PROVIDER_REGISTRY: Record<
  AIProviderId,
  AIProviderConstructor
> = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  google: GoogleProvider,
  mistral: MistralProvider,
  xai: XAIProvider,
};

export function createAIProvider(
  providerId: AIProviderId,
  config: AIProviderConfig,
): AIProvider {
  const Provider = AI_PROVIDER_REGISTRY[providerId];
  return new Provider(config);
}

function extractOpenAIOutputText(value: unknown): string {
  if (typeof value !== "object" || value === null) return "";
  if (
    "output_text" in value &&
    typeof (value as { output_text?: unknown }).output_text === "string"
  ) {
    return (value as { output_text: string }).output_text;
  }

  const output = (value as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";

  const parts: string[] = [];
  for (const item of output) {
    if (typeof item !== "object" || item === null) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const contentPart of content) {
      if (typeof contentPart !== "object" || contentPart === null) continue;
      const text = (contentPart as { text?: unknown }).text;
      if (typeof text === "string") parts.push(text);
    }
  }

  return parts.join("");
}

function extractAnthropicOutputText(value: unknown): string {
  if (typeof value !== "object" || value === null) return "";
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part !== "object" || part === null) return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

function extractGoogleOutputText(value: unknown): string {
  if (typeof value !== "object" || value === null) return "";
  const candidates = (value as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return "";

  return candidates
    .map((candidate) => {
      if (typeof candidate !== "object" || candidate === null) return "";
      const content = (candidate as { content?: unknown }).content;
      if (typeof content !== "object" || content === null) return "";
      const parts = (content as { parts?: unknown }).parts;
      if (!Array.isArray(parts)) return "";

      return parts
        .map((part) => {
          if (typeof part !== "object" || part === null) return "";
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        })
        .join("");
    })
    .join("");
}

function extractChatCompletionText(value: unknown): string {
  if (typeof value !== "object" || value === null) return "";
  const choices = (value as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";

  return choices
    .map((choice) => {
      if (typeof choice !== "object" || choice === null) return "";
      const message = (choice as { message?: unknown }).message;
      if (typeof message !== "object" || message === null) return "";
      const content = (message as { content?: unknown }).content;
      return typeof content === "string" ? content : "";
    })
    .join("");
}
