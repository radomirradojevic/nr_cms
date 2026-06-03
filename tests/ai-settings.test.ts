import assert from "node:assert/strict";
import test from "node:test";

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
