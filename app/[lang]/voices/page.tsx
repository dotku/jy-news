import { getAllPosts } from "@/lib/posts";
import { isValidLang, locales, type Lang } from "@/lib/i18n";
import TimeAgo from "@/components/TimeAgo";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const title =
    lang === "zh"
      ? "行业之声 - JY Tech News"
      : "Industry Voices - JY Tech News";
  return { title };
}

export default async function VoicesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLang(lang)) notFound();

  const posts = getAllPosts();
  const title = lang === "zh" ? "行业之声" : "Industry Voices";
  const subtitle =
    lang === "zh"
      ? "来自科技行业领袖的最新观点与动态"
      : "Latest insights from tech industry leaders";

  // Group by handle for the influencer cards
  const handles = [...new Set(posts.map((p) => p.handle))];
  const influencerMap = new Map<
    string,
    { name: string; title: string; count: number }
  >();
  for (const post of posts) {
    if (!influencerMap.has(post.handle)) {
      influencerMap.set(post.handle, {
        name: post.name,
        title: post.authorTitle,
        count: 0,
      });
    }
    influencerMap.get(post.handle)!.count++;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>

      {/* Influencer chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {handles.map((handle) => {
          const info = influencerMap.get(handle)!;
          return (
            <div
              key={handle}
              className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {info.name}
              </span>
              <span className="text-xs text-zinc-400">@{handle}</span>
            </div>
          );
        })}
      </div>

      {/* Posts feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <a
            key={post.slug}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {post.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {post.name}
                  </span>
                  <span className="text-sm text-zinc-400">@{post.handle}</span>
                  <TimeAgo date={post.date} lang={lang as Lang} />
                  {post.isRT && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                      RT
                    </span>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {post.content}
                </p>
                {post.image && (
                  <div className="mt-3 overflow-hidden rounded-lg">
                    <img
                      src={post.image}
                      alt=""
                      className="max-h-64 object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
