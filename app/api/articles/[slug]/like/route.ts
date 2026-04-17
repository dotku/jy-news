import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { articleStats } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  await db
    .insert(articleStats)
    .values({ slug, views: 0, likes: 1 })
    .onConflictDoUpdate({
      target: articleStats.slug,
      set: {
        likes: sql`${articleStats.likes} + 1`,
        updatedAt: sql`now()`,
      },
    });

  const rows = await db
    .select()
    .from(articleStats)
    .where(eq(articleStats.slug, slug));

  return NextResponse.json({ likes: rows[0].likes });
}
