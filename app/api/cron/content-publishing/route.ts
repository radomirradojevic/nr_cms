import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath, updateTag } from "next/cache";

import { runContentPublishingSchedule } from "@/data/content-publishing";

export const dynamic = "force-dynamic";

function getCronSecrets(): string[] {
  return [
    process.env.CONTENT_PUBLISHING_CRON_SECRET,
    process.env.CRON_SECRET,
  ].flatMap((value) => {
    const secret = value?.trim();
    return secret ? [secret] : [];
  });
}

function isAuthorized(request: NextRequest): boolean {
  const secrets = getCronSecrets();
  if (secrets.length === 0) return false;

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  return secrets.some(
    (secret) => bearer === `Bearer ${secret}` || headerSecret === secret,
  );
}

async function handleContentPublishingCron(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runContentPublishingSchedule();
  const changed = [...result.published, ...result.unpublished];

  if (changed.length > 0) {
    updateTag("top-menu");
    revalidatePath("/");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard/content");
    for (const row of changed) {
      revalidatePath(`/${row.slug}`);
    }
  }

  console.log(
    `[content-publishing-cron] published=${result.published.length} unpublished=${result.unpublished.length}`,
  );

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
