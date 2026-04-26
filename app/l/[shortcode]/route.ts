import { NextRequest, NextResponse } from 'next/server';
import { getLinkByShortCode } from '@/data/links';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shortcode: string }> },
) {
  const { shortcode } = await params;
  const link = await getLinkByShortCode(shortcode);

  if (!link) {
    return new NextResponse('Not Found', { status: 404 });
  }

  return NextResponse.redirect(link.originalUrl, { status: 301 });
}
