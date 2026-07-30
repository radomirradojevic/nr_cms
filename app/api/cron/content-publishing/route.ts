import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { runContentPublishingSchedule } from "@/data/content-publishing";
import { TOP_MENU_TAG } from "@/data/top-menu";
import { isCronRequestAuthorized } from "@/lib/cron-auth";
import { securityLogger } from "@/lib/security/logger";

export const dynamic = "force-dynamic";

async function handleContentPublishingCron(request: NextRequest) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runContentPublishingSchedule();
  const changed = [...result.published, ...result.unpublished];

  if (changed.length > 0) {
    revalidateTag(TOP_MENU_TAG, { expire: 0 });
    revalidatePath("/");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard/content");
    for (const row of changed) {
      revalidatePath(`/${row.slug}`);
    }
  }

  securityLogger.info("content_publishing_cron.completed", {
    published: result.published.length,
    unpublished: result.unpublished.length,
  });

  return NextResponse.json({
    success: true,
    published: result.published.length,
    unpublished: result.unpublished.length,
  });
}

export async function GET(request: NextRequest) {
  return handleContentPublishingCron(request);
}

export async function POST(request: NextRequest) {
  return handleContentPublishingCron(request);
}
