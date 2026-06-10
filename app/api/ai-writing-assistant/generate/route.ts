import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAiWritingAssistantServerSettings } from "@/data/global-settings";
import {
  createAIProvider,
  getAIProviderFailureDetails,
} from "@/lib/ai-provider-registry";
import {
  AI_PROVIDER_LABELS,
  AIProviderIdSchema,
  AIProviderModelIdSchema,
  resolveAiProviderModel,
} from "@/lib/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

const GenerateRequestSchema = z.object({
  providerId: AIProviderIdSchema.optional(),
  model: AIProviderModelIdSchema.optional(),
  field: z.enum(["description", "excerpt", "metaTitle", "metaDescription"]),
  surface: z
    .enum(["blogEditor", "pageBuilder", "productEditor"])
    .default("blogEditor"),
  title: z.string().trim().max(200).optional(),
  excerpt: z.string().trim().max(2_000).optional(),
  content: z.string().trim().max(8_000).optional(),
  currentValue: z.string().trim().max(2_000).optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const user = await getOptionalCurrentUser();
  const roles = getRoles(user?.publicMetadata);
  const allowed =
    hasRole(roles, "admin") ||
    hasRole(roles, "publisher") ||
    hasRole(roles, "author");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const contextError = getContextError(body);
  if (contextError) {
    return NextResponse.json({ error: contextError }, { status: 400 });
  }

  const settings = await getAiWritingAssistantServerSettings();
  const assistantEnabled = getAssistantEnabledForSurface(
    body.surface,
    settings,
  );
  if (!assistantEnabled) {
    return NextResponse.json(
      { error: getAssistantDisabledMessage(body.surface) },
      { status: 403 },
    );
  }

  const providerId = body.providerId ?? settings.defaultProvider;
  const providerSettings = settings.providers[providerId];
  if (!providerSettings.enabled) {
    return NextResponse.json(
      { error: `${AI_PROVIDER_LABELS[providerId]} is not enabled.` },
      { status: 403 },
    );
  }
  const model = resolveAiProviderModel(providerSettings, body.model);
  if (!model) {
    return NextResponse.json(
      {
        error: body.model
          ? `${AI_PROVIDER_LABELS[providerId]} model is not enabled.`
          : `${AI_PROVIDER_LABELS[providerId]} has no enabled AI models.`,
      },
      { status: 400 },
    );
  }
  if (!providerSettings.apiKey) {
    return NextResponse.json(
      { error: `${AI_PROVIDER_LABELS[providerId]} API key is not configured.` },
      { status: 400 },
    );
  }

  const prompt = buildGenerationPrompt(body, providerSettings.instructions);
  const provider = createAIProvider(providerId, {
    apiKey: providerSettings.apiKey,
    model,
    maxOutputTokens: getGenerationTokenLimit(
      body.field,
      providerSettings.maxOutputTokens,
    ),
    timeoutMs: getGenerationTimeoutMs(providerId, model),
    openaiReasoningEffort: "none",
    openaiTextVerbosity: "low",
  });

  let output: string;
  try {
    output = await provider.generateCompletion(prompt, "");
  } catch (err) {
    const failure = getAIProviderFailureDetails(err, {
      providerLabel: AI_PROVIDER_LABELS[providerId],
      model,
      serviceLabel: "generation",
    });
    console.error("[ai-writing-assistant] provider request failed:", {
      providerId,
      model,
      providerStatus: failure.providerStatus,
      providerMessage: failure.providerMessage,
      timedOut: failure.timedOut,
    });
    return NextResponse.json(
      { error: failure.message },
      { status: failure.status },
    );
  }

  const text = normalizeGeneratedText(output, body.field);
  if (!text) {
    return NextResponse.json(
      { error: "AI did not return usable text." },
      { status: 502 },
    );
  }

  return NextResponse.json({ text });
}

function getContextError(body: z.infer<typeof GenerateRequestSchema>) {
  if (
    body.surface === "pageBuilder" &&
    (body.field === "description" || body.field === "excerpt")
  ) {
    return "Page builder AI assistant can generate SEO text only.";
  }

  if (!hasText(body.title)) {
    if (body.field === "description") {
      return "Enter a title first so AI has enough context for the description.";
    }
    return body.field === "excerpt"
      ? "Enter a title first so AI has enough context for the excerpt."
      : "Enter a title first so AI has enough context for SEO text.";
  }

  if (body.surface === "pageBuilder") {
    return null;
  }

  if (
    body.field !== "description" &&
    body.field !== "excerpt" &&
    !hasText(body.excerpt) &&
    !hasText(body.content)
  ) {
    return "Enter an excerpt or content first so AI has enough context for SEO text.";
  }

  return null;
}

function hasText(value: string | null | undefined) {
  return !!value?.trim();
}

function getAssistantEnabledForSurface(
  surface: z.infer<typeof GenerateRequestSchema>["surface"],
  settings: Awaited<ReturnType<typeof getAiWritingAssistantServerSettings>>,
) {
  switch (surface) {
    case "pageBuilder":
      return settings.pageBuilderEnabled;
    case "productEditor":
      return settings.webshopEnabled;
    case "blogEditor":
    default:
      return settings.enabled;
  }
}

function getAssistantDisabledMessage(
  surface: z.infer<typeof GenerateRequestSchema>["surface"],
) {
  switch (surface) {
    case "pageBuilder":
      return "AI assistant is disabled.";
    case "productEditor":
      return "WebShop AI assistant is disabled.";
    case "blogEditor":
    default:
      return "AI writing assistant is disabled.";
  }
}

function buildGenerationPrompt(
  body: z.infer<typeof GenerateRequestSchema>,
  customInstructions: string | null,
) {
  const fieldLabel = getFieldLabel(body.field);

  return [
    getSurfacePromptIntro(body.surface),
    "Write in the same language as the title, excerpt, and content.",
    body.surface === "productEditor"
      ? "Do not invent warranty, certification, shipping speed, discounts, health claims, origin claims, stock claims, or compatibility claims unless they are explicitly present in the input."
      : "",
    "Return only the requested field text. Do not include labels, quotes, markdown, or explanations.",
    getGenerationFieldInstruction(body.field),
    customInstructions ? `Editorial instructions: ${customInstructions}` : "",
    "",
    `Requested field: ${fieldLabel}`,
    `Title: ${body.title ?? ""}`,
    body.excerpt ? `Excerpt: ${body.excerpt}` : "",
    body.content ? `Content: ${body.content}` : "",
    body.currentValue
      ? `Current ${fieldLabel} to improve or replace: ${body.currentValue}`
      : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function getSurfacePromptIntro(
  surface: z.infer<typeof GenerateRequestSchema>["surface"],
) {
  switch (surface) {
    case "pageBuilder":
      return "You are an AI assistant inside a CMS page builder.";
    case "productEditor":
      return "You are an AI writing assistant inside a private Webshop product editor.";
    case "blogEditor":
    default:
      return "You are an AI writing assistant inside a CMS blog post editor.";
  }
}

function getGenerationFieldInstruction(
  field: z.infer<typeof GenerateRequestSchema>["field"],
) {
  switch (field) {
    case "description":
      return "Generate a product Description: helpful product copy in 1-2 short paragraphs, specific to the supplied facts, suitable for a webshop product page.";
    case "excerpt":
      return "Generate an Excerpt: one concise paragraph, 1-2 sentences, specific and useful, maximum 450 characters.";
    case "metaTitle":
      return "Generate a Meta title: clear, SEO-friendly, ideally 50-60 characters and no longer than 70 characters.";
    case "metaDescription":
      return "Generate a Meta description: specific, SEO-friendly, ideally 140-160 characters and no longer than 170 characters.";
  }
}

function getGenerationTokenLimit(
  field: z.infer<typeof GenerateRequestSchema>["field"],
  configuredLimit: number,
) {
  const suggestedMinimum = field === "metaTitle" ? 64 : 120;
  const max = field === "description" ? 260 : 180;
  return Math.min(max, Math.max(configuredLimit, suggestedMinimum));
}

function getGenerationTimeoutMs(providerId: string, model: string) {
  return providerId === "openai" && /(?:^|[-.])pro(?:[-.]|$)/iu.test(model)
    ? 60_000
    : 15_000;
}

function getFieldLabel(field: z.infer<typeof GenerateRequestSchema>["field"]) {
  switch (field) {
    case "description":
      return "Description";
    case "excerpt":
      return "Excerpt";
    case "metaTitle":
      return "Meta title";
    case "metaDescription":
      return "Meta description";
  }
}

function normalizeGeneratedText(
  value: string,
  field: z.infer<typeof GenerateRequestSchema>["field"],
) {
  let text = value
    .replace(/^```(?:\w+)?\s*/u, "")
    .replace(/```$/u, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  text = text.replace(
    /^(?:description|excerpt|meta title|meta description)\s*:\s*/iu,
    "",
  );

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  if (field === "metaTitle") {
    return text.replace(/\s+/g, " ").slice(0, 300);
  }

  if (field === "metaDescription") {
    return text.replace(/\s+/g, " ").slice(0, 1_000);
  }

  if (field === "description") {
    return text.slice(0, 4_000);
  }

  return text.replace(/\n+/g, " ").replace(/\s+/g, " ").slice(0, 2_000);
}
