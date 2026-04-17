import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isValidLang, locales } from "@/lib/i18n";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidLang(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: `${t.aboutTitle} - ${t.siteName}`,
    description: t.aboutDesc,
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLang(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {t.aboutTitle}
      </h1>

      <div className="mt-8 space-y-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p>{t.aboutDesc}</p>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.focusAreas}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {t.topics.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800"
              >
                <span>{item.icon}</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.techStack}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Next.js 16 · React 19 · TypeScript · Tailwind CSS · MDX · Drizzle
            ORM · Neon Postgres · Cloudflare R2 · Vercel
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {t.coverage}
          </h2>
          <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            {t.coverageItems.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-green-500" : "bg-blue-500"}`}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          {t.builtBy}{" "}
          <a
            href="https://jytech.us"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 hover:underline dark:text-green-400"
          >
            JYTech
          </a>
        </p>
      </div>
    </main>
  );
}
