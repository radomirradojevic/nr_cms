import assert from "node:assert/strict";
import test from "node:test";

import {
  AIProviderRequestError,
  getAIProviderFailureDetails,
  OpenAIProvider,
} from "@/lib/ai-provider-registry";
import {
  getEnabledAiProviderOptions,
  parseAiProviderServerSettingsById,
  parseAiWritingAssistantSettings,
  resolveAiProviderModel,
} from "@/lib/global-settings";

test("AI provider settings migrate legacy single model config to enabled models", () => {
  const providers = parseAiProviderServerSettingsById({
    openai: {
      enabled: true,
      apiKey: "sk-test-key",
      model: "gpt-4.1",
      maxOutputTokens: 64,
      instructions: "Keep it concise.",
    },
  });

  assert.equal(providers.openai.model, "gpt-4.1");
  assert.deepEqual(providers.openai.enabledModels, ["gpt-4.1"]);
  assert.equal(resolveAiProviderModel(providers.openai), "gpt-4.1");
});

test("AI provider options exclude enabled providers with no enabled models", () => {
  const settings = parseAiWritingAssistantSettings({
    enabled: true,
    defaultProvider: "openai",
    providerSettings: {
      openai: {
        enabled: true,
        model: "gpt-5.5",
        enabledModels: [],
        maxOutputTokens: 48,
        instructions: null,
      },
      anthropic: {
        enabled: true,
        model: "claude-opus-4-5-20251101",
        enabledModels: ["claude-opus-4-5-20251101"],
        maxOutputTokens: 48,
        instructions: null,
      },
    },
  });

  const options = getEnabledAiProviderOptions(settings);

  assert.equal(settings.defaultProvider, "anthropic");
  assert.deepEqual(
    options.map((provider) => provider.id),
    ["anthropic"],
  );
  assert.equal(options[0]?.defaultModel, "claude-opus-4-5-20251101");
});

test("AI model resolver rejects models not enabled for the provider", () => {
  const providers = parseAiProviderServerSettingsById({
    openai: {
      enabled: true,
      model: "gpt-5.5",
      enabledModels: ["gpt-5.5", "gpt-5.4"],
      maxOutputTokens: 48,
      instructions: null,
    },
  });

  assert.equal(resolveAiProviderModel(providers.openai, "gpt-5.4"), "gpt-5.4");
  assert.equal(resolveAiProviderModel(providers.openai, "gpt-4.1"), null);
});

test("AI provider failure details explain unavailable models", () => {
  const details = getAIProviderFailureDetails(
    new AIProviderRequestError("OpenAI", 404, {
      error: {
        message:
          "The model `gpt-example` does not exist or you do not have access to it.",
      },
    }),
    {
      providerLabel: "OpenAI",
      model: "gpt-example",
      serviceLabel: "generation",
    },
  );

  assert.equal(details.status, 400);
  assert.equal(details.providerStatus, 404);
  assert.match(details.message, /not available for this API key or project/);
  assert.match(details.message, /gpt-example/);
});

test("AI provider failure details explain provider timeouts", () => {
  const details = getAIProviderFailureDetails(
    { name: "TimeoutError" },
    {
      providerLabel: "OpenAI",
      model: "gpt-5.5-pro",
      serviceLabel: "generation",
    },
  );

  assert.equal(details.status, 504);
  assert.equal(details.timedOut, true);
  assert.match(details.message, /Try a faster model/);
});

test("OpenAI provider disables reasoning for short GPT-5.5 text tasks", async (t) => {
  const requestBodies: Record<string, unknown>[] = [];

  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ output_text: "Meta title" }), {
      status: 200,
    });
  });

  const provider = new OpenAIProvider({
    apiKey: "sk-test-key",
    model: "gpt-5.5",
    maxOutputTokens: 64,
    openaiReasoningEffort: "none",
    openaiTextVerbosity: "low",
  });

  const output = await provider.generateCompletion("Generate a title", "");

  const requestBody = requestBodies[0];
  assert.ok(requestBody);
  assert.equal(output, "Meta title");
  assert.deepEqual(requestBody.reasoning, { effort: "none" });
  assert.deepEqual(requestBody.text, { verbosity: "low" });
  assert.equal(requestBody.max_output_tokens, 768);
});

test("OpenAI provider preserves pro reasoning defaults but raises token budget", async (t) => {
  const requestBodies: Record<string, unknown>[] = [];

  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return new Response(JSON.stringify({ output_text: "Meta description" }), {
      status: 200,
    });
  });

  const provider = new OpenAIProvider({
    apiKey: "sk-test-key",
    model: "gpt-5.5-pro",
    maxOutputTokens: 64,
    openaiReasoningEffort: "none",
    openaiTextVerbosity: "low",
  });

  const output = await provider.generateCompletion("Generate a description", "");

  const requestBody = requestBodies[0];
  assert.ok(requestBody);
  assert.equal(output, "Meta description");
  assert.equal(requestBody.reasoning, undefined);
  assert.deepEqual(requestBody.text, { verbosity: "low" });
  assert.equal(requestBody.max_output_tokens, 4096);
});

test("OpenAI provider explains incomplete reasoning-only responses", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    return new Response(
      JSON.stringify({
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output: [],
        usage: {
          output_tokens_details: { reasoning_tokens: 768 },
        },
      }),
      { status: 200 },
    );
  });

  const provider = new OpenAIProvider({
    apiKey: "sk-test-key",
    model: "gpt-5.5",
    maxOutputTokens: 64,
    openaiReasoningEffort: "none",
  });

  await assert.rejects(
    () => provider.generateCompletion("Generate a title", ""),
    /ran out of output tokens/,
  );
});
