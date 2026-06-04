import { type AIProviderId } from "@/lib/global-settings";

export interface AIProvider {
  generateCompletion(prompt: string, context: string): Promise<string>;
}

export type AIProviderConfig = {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  timeoutMs?: number;
  openaiReasoningEffort?: OpenAIReasoningEffort;
  openaiTextVerbosity?: OpenAITextVerbosity;
};

type AIProviderConstructor = new (config: AIProviderConfig) => AIProvider;
export type OpenAIReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";
export type OpenAITextVerbosity = "low" | "medium" | "high";

export class AIProviderRequestError extends Error {
  constructor(
    readonly provider: string,
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
    const requestBody = buildOpenAIRequestBody(
      this.config.model,
      this.buildPrompt(prompt, context),
      this.config,
    );
    const data = await this.postJson("https://api.openai.com/v1/responses", {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const text = extractOpenAIOutputText(data);
    if (text) return text;

    const emptyResponseMessage = getOpenAIEmptyResponseMessage(data);
    if (emptyResponseMessage) {
      throw new AIProviderOutputError("OpenAI", emptyResponseMessage, data);
    }

    return "";
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

export type AIProviderFailureDetails = {
  status: number;
  message: string;
  providerStatus: number | null;
  providerMessage: string | null;
  timedOut: boolean;
};

export function getAIProviderFailureDetails(
  error: unknown,
  {
    providerLabel,
    model,
    serviceLabel,
  }: {
    providerLabel: string;
    model: string;
    serviceLabel: string;
  },
): AIProviderFailureDetails {
  if (isTimeoutError(error)) {
    return {
      status: 504,
      message: `${providerLabel} request timed out while using "${model}". Try a faster model.`,
      providerStatus: null,
      providerMessage: null,
      timedOut: true,
    };
  }

  if (error instanceof AIProviderRequestError) {
    const providerMessage = extractProviderErrorMessage(error.data);
    const suffix = providerMessage ? ` ${providerMessage}` : "";

    if (error.status === 400 || error.status === 404) {
      return {
        status: 400,
        message: `${providerLabel} model "${model}" is not available for this API key or project.${suffix}`,
        providerStatus: error.status,
        providerMessage,
        timedOut: false,
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        status: 400,
        message: `${providerLabel} API key is not authorized for this request.${suffix}`,
        providerStatus: error.status,
        providerMessage,
        timedOut: false,
      };
    }

    if (error.status === 429) {
      return {
        status: 429,
        message: `${providerLabel} rate limit or quota was reached.${suffix}`,
        providerStatus: error.status,
        providerMessage,
        timedOut: false,
      };
    }

    return {
      status: 502,
      message:
        error.status >= 500
          ? `${providerLabel} service is temporarily unavailable.${suffix}`
          : `${providerLabel} rejected the ${serviceLabel} request.${suffix}`,
      providerStatus: error.status,
      providerMessage,
      timedOut: false,
    };
  }

  if (error instanceof AIProviderOutputError) {
    return {
      status: 502,
      message: error.message,
      providerStatus: null,
      providerMessage: error.message,
      timedOut: false,
    };
  }

  return {
    status: 502,
    message: `AI ${serviceLabel} service is unavailable.`,
    providerStatus: null,
    providerMessage: null,
    timedOut: false,
  };
}

class AIProviderOutputError extends Error {
  constructor(
    readonly provider: string,
    message: string,
    readonly data: unknown,
  ) {
    super(message);
    this.name = "AIProviderOutputError";
  }
}

type OpenAIRequestBody = {
  model: string;
  input: string;
  max_output_tokens: number;
  store: false;
  reasoning?: { effort: OpenAIReasoningEffort };
  text?: { verbosity: OpenAITextVerbosity };
};

function buildOpenAIRequestBody(
  model: string,
  input: string,
  config: AIProviderConfig,
): OpenAIRequestBody {
  const body: OpenAIRequestBody = {
    model,
    input,
    max_output_tokens: getOpenAIMaxOutputTokens(model, config.maxOutputTokens),
    store: false,
  };

  const reasoningEffort = getOpenAIReasoningEffort(
    model,
    config.openaiReasoningEffort,
  );
  if (reasoningEffort) {
    body.reasoning = { effort: reasoningEffort };
  }

  const verbosity = getOpenAITextVerbosity(model, config.openaiTextVerbosity);
  if (verbosity) {
    body.text = { verbosity };
  }

  return body;
}

function getOpenAIReasoningEffort(
  model: string,
  requestedEffort: OpenAIReasoningEffort | undefined,
): OpenAIReasoningEffort | null {
  if (!isOpenAIReasoningModel(model) || isOpenAIProModel(model)) {
    return null;
  }

  const effort = requestedEffort ?? "low";
  if (effort === "none" && !supportsOpenAINoneReasoning(model)) {
    return "low";
  }

  return effort;
}

function getOpenAITextVerbosity(
  model: string,
  requestedVerbosity: OpenAITextVerbosity | undefined,
): OpenAITextVerbosity | null {
  return isOpenAIGpt5Model(model) ? (requestedVerbosity ?? "low") : null;
}

function getOpenAIMaxOutputTokens(model: string, configuredLimit: number) {
  if (!isOpenAIReasoningModel(model)) return configuredLimit;
  if (isOpenAIProModel(model)) return Math.max(configuredLimit, 4_096);
  if (supportsOpenAINoneReasoning(model)) return Math.max(configuredLimit, 768);
  return Math.max(configuredLimit, 1_536);
}

function isOpenAIReasoningModel(model: string): boolean {
  return isOpenAIGpt5Model(model) || /^o\d(?:[-.]|$)/iu.test(model);
}

function isOpenAIGpt5Model(model: string): boolean {
  return /^gpt-5(?:[-.]|$)/iu.test(model);
}

function isOpenAIProModel(model: string): boolean {
  return /(?:^|[-.])pro(?:[-.]|$)/iu.test(model);
}

function supportsOpenAINoneReasoning(model: string): boolean {
  const match = /^gpt-5\.(\d+)/iu.exec(model);
  return Boolean(match && Number.parseInt(match[1] ?? "0", 10) >= 1);
}

function isTimeoutError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return name === "TimeoutError" || name === "AbortError";
}

function extractProviderErrorMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;

  const error = (data as { error?: unknown }).error;
  if (typeof error === "string") return normalizeProviderMessage(error);

  if (typeof error === "object" && error !== null) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return normalizeProviderMessage(message);
  }

  const message = (data as { message?: unknown }).message;
  return typeof message === "string" ? normalizeProviderMessage(message) : null;
}

function normalizeProviderMessage(message: string): string | null {
  const normalized = message
    .replace(/sk-[A-Za-z0-9_-]+/g, "sk-...")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);

  return normalized || null;
}

function getOpenAIEmptyResponseMessage(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return null;

  const status = (value as { status?: unknown }).status;
  const incompleteDetails = (value as { incomplete_details?: unknown })
    .incomplete_details;
  const reason =
    typeof incompleteDetails === "object" && incompleteDetails !== null
      ? (incompleteDetails as { reason?: unknown }).reason
      : null;

  if (status === "incomplete" && reason === "max_output_tokens") {
    const reasoningTokens = getOpenAIReasoningTokenCount(value);
    const tokenNote =
      reasoningTokens === null
        ? ""
        : ` Reasoning used ${reasoningTokens.toLocaleString("en-US")} output tokens.`;
    return `OpenAI response ran out of output tokens before producing visible text.${tokenNote} Try a faster model or increase the output token budget.`;
  }

  return null;
}

function getOpenAIReasoningTokenCount(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const usage = (value as { usage?: unknown }).usage;
  if (typeof usage !== "object" || usage === null) return null;
  const outputDetails = (usage as { output_tokens_details?: unknown })
    .output_tokens_details;
  if (typeof outputDetails !== "object" || outputDetails === null) return null;
  const reasoningTokens = (outputDetails as { reasoning_tokens?: unknown })
    .reasoning_tokens;
  return typeof reasoningTokens === "number" ? reasoningTokens : null;
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
