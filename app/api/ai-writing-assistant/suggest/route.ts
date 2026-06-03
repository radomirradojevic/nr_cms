import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAiWritingAssistantServerSettings } from "@/data/global-settings";
import { createAIProvider } from "@/lib/ai-provider-registry";
import {
  AI_PROVIDER_LABELS,
  AIProviderIdSchema,
  AIProviderModelIdSchema,
  resolveAiProviderModel,
} from "@/lib/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

const SuggestionRequestSchema = z.object({
  providerId: AIProviderIdSchema.optional(),
  model: AIProviderModelIdSchema.optional(),
  field: z
    .enum(["content", "excerpt", "metaTitle", "metaDescription"])
    .optional(),
  title: z.string().trim().max(200).optional(),
  excerpt: z.string().trim().max(2_000).optional(),
  content: z.string().trim().max(8_000).optional(),
  before: z.string().max(4_000),
  after: z.string().max(1_000).optional(),
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

  const parsed = SuggestionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const settings = await getAiWritingAssistantServerSettings();
  if (!settings.enabled) {
    return NextResponse.json(
      { error: "AI writing assistant is disabled." },
      { status: 403 },
    );
  }

  const body = parsed.data;
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

  const prompt = buildSuggestionPrompt(body, providerSettings.instructions);
  const provider = createAIProvider(providerId, {
    apiKey: providerSettings.apiKey,
    model,
    maxOutputTokens: providerSettings.maxOutputTokens,
    timeoutMs: 12_000,
  });

  let output: string;
  try {
    output = await provider.generateCompletion(prompt, "");
  } catch (err) {
    console.error("[ai-writing-assistant] provider request failed:", err);
    return NextResponse.json(
      { error: "AI suggestion service is unavailable." },
      { status: 502 },
    );
  }

  const suggestion = normalizeSuggestion(output, body.before);
  return NextResponse.json({ suggestion });
}

function buildSuggestionPrompt(
  body: z.infer<typeof SuggestionRequestSchema>,
  customInstructions: string | null,
) {
  return [
    "You are an inline autocomplete assistant for a CMS blog editor.",
    "Continue exactly from the cursor. Return only the suggested continuation.",
    "Do not explain, do not wrap the answer in quotes, and do not repeat the text before the cursor.",
    "Keep the continuation short: usually a phrase or one sentence.",
    "Include leading whitespace only when it is needed to continue naturally.",
    getSuggestionFieldInstruction(body.field ?? "content"),
    customInstructions ? `Editorial instructions: ${customInstructions}` : "",
    "",
    `Title: ${body.title ?? ""}`,
    `Excerpt: ${body.excerpt ?? ""}`,
    body.content ? `Content context: ${body.content}` : "",
    "",
    "Text before cursor:",
    body.before,
    "",
    "Text after cursor:",
    body.after ?? "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function getSuggestionFieldInstruction(
  field: NonNullable<z.infer<typeof SuggestionRequestSchema>["field"]>,
) {
  switch (field) {
    case "excerpt":
      return "The active field is Excerpt. Continue a concise blog summary and avoid repeating the title.";
    case "metaTitle":
      return "The active field is Meta title. Keep the final title concise, SEO-friendly, and ideally under 70 characters.";
    case "metaDescription":
      return "The active field is Meta description. Keep the final description SEO-friendly, specific, and ideally under 170 characters.";
    case "content":
    default:
      return "The active field is the main blog content.";
  }
}

function normalizeSuggestion(value: string, before: string): string {
  let suggestion = value
    .replace(/^```(?:\w+)?\s*/u, "")
    .replace(/```$/u, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+$/u, "");

  if (
    (suggestion.startsWith('"') && suggestion.endsWith('"')) ||
    (suggestion.startsWith("'") && suggestion.endsWith("'"))
  ) {
    suggestion = suggestion.slice(1, -1);
  }

  const lastBefore = before.at(-1);
  const firstSuggestion = suggestion.at(0);
  if (
    lastBefore &&
    firstSuggestion &&
    !/\s/u.test(lastBefore) &&
    /[A-Z0-9]/u.test(firstSuggestion)
  ) {
    suggestion = ` ${suggestion}`;
  }

  return suggestion.slice(0, 600);
}
