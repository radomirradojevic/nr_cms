import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAiWritingAssistantServerSettings } from "@/data/global-settings";
import { createAIProvider } from "@/lib/ai-provider-registry";
import { AI_PROVIDER_LABELS, AIProviderIdSchema } from "@/lib/global-settings";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles, hasRole } from "@/lib/roles";

const GenerateRequestSchema = z.object({
  providerId: AIProviderIdSchema.optional(),
  field: z.enum(["excerpt", "metaTitle", "metaDescription"]),
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
  if (!settings.enabled) {
    return NextResponse.json(
      { error: "AI writing assistant is disabled." },
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
  if (!providerSettings.apiKey) {
    return NextResponse.json(
      { error: `${AI_PROVIDER_LABELS[providerId]} API key is not configured.` },
      { status: 400 },
    );
  }

  const prompt = buildGenerationPrompt(body, providerSettings.instructions);
  const provider = createAIProvider(providerId, {
    apiKey: providerSettings.apiKey,
    model: providerSettings.model,
    maxOutputTokens: getGenerationTokenLimit(
      body.field,
      providerSettings.maxOutputTokens,
    ),
    timeoutMs: 15_000,
  });

  let output: string;
  try {
    output = await provider.generateCompletion(prompt, "");
  } catch (err) {
    console.error("[ai-writing-assistant] provider request failed:", err);
    return NextResponse.json(
      { error: "AI generation service is unavailable." },
      { status: 502 },
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
  if (!hasText(body.title)) {
    return body.field === "excerpt"
      ? "Enter a title first so AI has enough context for the excerpt."
      : "Enter a title first so AI has enough context for SEO text.";
  }

  if (
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

function buildGenerationPrompt(
  body: z.infer<typeof GenerateRequestSchema>,
  customInstructions: string | null,
) {
  const fieldLabel = getFieldLabel(body.field);

  return [
    "You are an AI writing assistant inside a CMS blog post editor.",
    "Write in the same language as the title, excerpt, and content.",
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

function getGenerationFieldInstruction(
  field: z.infer<typeof GenerateRequestSchema>["field"],
) {
  switch (field) {
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
  return Math.min(180, Math.max(configuredLimit, suggestedMinimum));
}

function getFieldLabel(field: z.infer<typeof GenerateRequestSchema>["field"]) {
  switch (field) {
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

  text = text.replace(/^(?:excerpt|meta title|meta description)\s*:\s*/iu, "");

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

  return text.replace(/\n+/g, " ").replace(/\s+/g, " ").slice(0, 2_000);
}
