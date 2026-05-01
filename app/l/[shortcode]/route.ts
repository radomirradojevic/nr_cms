import { NextRequest, NextResponse } from "next/server";
import { getLinkByShortCode } from "@/data/links";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shortcode: string }> },
) {
  const { shortcode } = await params;

  let link: Awaited<ReturnType<typeof getLinkByShortCode>>;
  try {
    link = await getLinkByShortCode(shortcode);
  } catch (err) {
    console.error("Database error in link redirect:", err);
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!link) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(link.originalUrl);
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.redirect(link.originalUrl, { status: 301 });
}
