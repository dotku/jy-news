import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articleStats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const rows = await db
    .select()
    .from(articleStats)
    .where(eq(articleStats.slug, slug));

  if (rows.length === 0) {
    return NextResponse.json({ slug, views: 0, likes: 0 });
  }

  return NextResponse.json({
    slug: rows[0].slug,
    views: rows[0].views,
    likes: rows[0].likes,
  });
}
