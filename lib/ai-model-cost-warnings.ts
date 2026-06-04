import type { AIProviderId } from "@/lib/global-settings";

export type AiProviderModelCostWarning = {
  tone: "danger" | "warning";
  text: string;
};

export function getAiProviderModelCostWarning(
  providerId: AIProviderId | undefined,
  modelId: string | undefined,
): AiProviderModelCostWarning | null {
  if (!providerId || !modelId) return null;

  const model = modelId.toLowerCase();

  if (providerId === "openai") {
    if (model === "chat-latest") {
      return {
        tone: "warning",
        text: "Dynamic alias: OpenAI may change the underlying model, pricing, and behavior. Use a pinned model for predictable CMS costs.",
      };
    }

    if (/(?:^|[-.])pro(?:[-.]|$)/u.test(model)) {
      return {
        tone: "danger",
        text: "VERY HIGH COST: pro reasoning can bill hidden reasoning as output. Avoid for routine CMS text.",
      };
    }

    if (/^gpt-5(?:[-.]|$)/u.test(model) || /^o\d(?:[-.]|$)/u.test(model)) {
      return {
        tone: "warning",
        text: "Reasoning model: hidden reasoning may use output tokens. Keep the token cap low and watch billing.",
      };
    }
  }

  if (providerId === "anthropic" && /opus/u.test(model)) {
    return {
      tone: "danger",
      text: "Premium model: use only for difficult edits where lower-cost models are not enough.",
    };
  }

  if (providerId === "google" && /pro/u.test(model)) {
    return {
      tone: "warning",
      text: "Higher-cost model: reserve for complex prompts, not routine short suggestions.",
    };
  }

  if (providerId === "mistral" && /large/u.test(model)) {
    return {
      tone: "warning",
      text: "Higher-cost model: use when smaller Mistral models are not enough.",
    };
  }

  if (providerId === "xai" && /grok-4|build/u.test(model)) {
    return {
      tone: "warning",
      text: "Premium model: check usage costs before enabling for frequent editor actions.",
    };
  }

  return null;
}

export function buildAiCostConfirmationMessage({
  providerLabel,
  modelLabel,
  warning,
  action,
}: {
  providerLabel: string;
  modelLabel: string;
  warning: AiProviderModelCostWarning;
  action: "enableAssistant" | "changeActiveModel" | "pageBuilderGenerate";
}): string {
  const prefix =
    warning.tone === "danger" ? "VERY HIGH COST WARNING" : "Cost warning";
  const actionText =
    action === "pageBuilderGenerate"
      ? "Page builder generation uses a separate larger JSON budget of about 2,800-4,000 output tokens."
      : action === "changeActiveModel"
        ? "The AI assistant is currently active, so inline suggestions may start using this model while editing."
        : "Inline editor suggestions may send paid requests automatically while you type.";

  return [
    `${prefix}: ${providerLabel} ${modelLabel}`,
    "",
    warning.text,
    actionText,
    "",
    "Continue only if you accept the possible API cost for this request/model.",
  ].join("\n");
}
