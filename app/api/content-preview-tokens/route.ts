import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getContentById } from "@/data/content";
import { createContentPreviewToken } from "@/data/content-preview-tokens";
import { hasContentPreviewRole } from "@/lib/content-preview-auth";
import { canAccessContentPreviewTarget } from "@/lib/content-preview-auth-server";
import { getOptionalCurrentUser } from "@/lib/optional-current-user";
import { getRoles } from "@/lib/roles";

const bodySchema = z.object({
  contentId: z.string().uuid(),
});

function json(
  body: Record<string, unknown>,
  init?: ResponseInit & { status?: number },
) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, { ...init, headers });
}

export async function POST(request: NextRequest) {
  const user = await getOptionalCurrentUser();
  if (!user) return json({ error: "Unauthorized." }, { status: 401 });

  const roles = getRoles(user.publicMetadata);
  if (!hasContentPreviewRole(roles)) {
    return json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    return json({ error: "Invalid content." }, { status: 400 });

  const target = await getContentById(parsed.data.contentId);
  if (!target) return json({ error: "Content not found." }, { status: 404 });

  if (
    !(await canAccessContentPreviewTarget({
      actorRoles: roles,
      actorUserId: user.id,
      target,
    }))
  ) {
    return json({ error: "Forbidden." }, { status: 403 });
  }

  const { token, expiresAt } = await createContentPreviewToken({
    contentId: target.id,
    createdBy: user.id,
  });
  const previewUrl = new URL(
    `/preview/content/${token}`,
    request.nextUrl.origin,
  ).toString();

  return json({
    success: true,
    previewUrl,
    expiresAt: expiresAt.toISOString(),
  });
}
