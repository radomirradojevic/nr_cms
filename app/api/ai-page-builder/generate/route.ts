import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildBuilderDataFromAiPagePlan,
  parseAiPagePlanOutput,
} from "@/app/dashboard/content/_builder/ai-page-plan";
import { ROOT_NODE_ID } from "@/app/dashboard/content/_builder/types";
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

const GeneratePageRequestSchema = z.object({
  providerId: AIProviderIdSchema.optional(),
  model: AIProviderModelIdSchema.optional(),
  mode: z.enum(["replace", "append"]).default("replace"),
  prompt: z.string().trim().min(8).max(2_000),
  title: z.string().trim().max(200).optional(),
  existingContent: z.string().trim().max(8_000).optional(),
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

  const parsed = GeneratePageRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const settings = await getAiWritingAssistantServerSettings();
  if (!settings.pageBuilderEnabled) {
    return NextResponse.json(
      { error: "AI assistant is disabled." },
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

  const provider = createAIProvider(providerId, {
    apiKey: providerSettings.apiKey,
    model,
    maxOutputTokens: pageBuilderGenerationTokenLimit(
      providerSettings.maxOutputTokens,
    ),
    timeoutMs: 30_000,
  });

  let output: string;
  try {
    output = await provider.generateCompletion(
      buildPagePlanPrompt(body, providerSettings.instructions),
      "",
    );
  } catch (err) {
    console.error("[ai-page-builder] provider request failed:", err);
    return NextResponse.json(
      { error: "AI generation service is unavailable." },
      { status: 502 },
    );
  }

  const planResult = parseAiPagePlanOutput(output);
  if (!planResult.ok) {
    console.error("[ai-page-builder] invalid plan:", planResult.error);
    return NextResponse.json(
      { error: "AI did not return a usable page plan." },
      { status: 502 },
    );
  }

  const builderData = buildBuilderDataFromAiPagePlan(planResult.plan);
  if ((builderData.nodes[ROOT_NODE_ID]?.nodes ?? []).length === 0) {
    return NextResponse.json(
      { error: "AI returned an empty page plan." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    builderData,
    seo: planResult.plan.seo ?? null,
  });
}

function buildPagePlanPrompt(
  body: z.infer<typeof GeneratePageRequestSchema>,
  customInstructions: string | null,
) {
  const targetScope =
    body.mode === "append"
      ? "Generate one to three new sections that can be appended to the current page."
      : "Generate a complete landing page.";

  return [
    "You are an AI assistant inside a CMS Craft.js page builder.",
    "Return only strict JSON. Do not use markdown, code fences, comments, or explanations.",
    "The JSON must match this schema exactly:",
    schemaReference(),
    "",
    targetScope,
    "Use only these blocks: Hero, Section, Layout, Heading, Text, Button, Image.",
    "Do not use RawHtml, Gallery, Video, Form, FormSubmissions, scripts, iframes, or custom CSS.",
    "For Image blocks, use an empty src unless the user explicitly provided a safe http(s) or relative image URL. Always include useful alt text.",
    "For Button href values, prefer safe anchors such as #contact, #services, #pricing, or relative paths.",
    "Use Layout when multiple related items should sit in columns, such as services, benefits, process steps, or pricing.",
    "Keep copy specific, practical, and conversion-oriented. Avoid filler.",
    "Write in the same language as the user prompt and page title.",
    customInstructions ? `Editorial instructions: ${customInstructions}` : "",
    "",
    `Page title: ${body.title ?? ""}`,
    `User prompt: ${body.prompt}`,
    body.existingContent ? `Existing page text: ${body.existingContent}` : "",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function schemaReference() {
  return JSON.stringify({
    blocks: [
      {
        block: "Hero",
        title: "Short headline",
        subtitle: "One or two sentence value proposition",
        variant: "contrast",
      },
      {
        block: "Section",
        variant: "default",
        padded: true,
        children: [
          { block: "Heading", level: "2", text: "Section heading" },
          { block: "Text", text: "Paragraph text." },
          {
            block: "Layout",
            preset: "3-col",
            gap: "md",
            columns: [
              [
                { block: "Heading", level: "3", text: "Column heading" },
                { block: "Text", text: "Column text." },
              ],
              [{ block: "Text", text: "Second column." }],
              [{ block: "Button", label: "Get started", href: "#contact" }],
            ],
          },
        ],
      },
    ],
    seo: {
      metaTitle: "SEO title up to 70 characters",
      metaDescription: "SEO description up to 160 characters",
    },
  });
}

function pageBuilderGenerationTokenLimit(configuredLimit: number) {
  return Math.min(4_000, Math.max(configuredLimit, 2_800));
}
