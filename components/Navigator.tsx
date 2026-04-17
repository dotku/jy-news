"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/lib/i18n";

const labels = {
  zh: { home: "首页", about: "关于" },
  en: { home: "Home", about: "About" },
};

export default function Navigator({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const t = labels[lang];
  const otherLang: Lang = lang === "zh" ? "en" : "zh";

  const navItems = [
    { name: t.home, path: `/${lang}` },
    { name: t.about, path: `/${lang}/about` },
  ];

  // Build the switch URL: replace /zh/ or /en/ with the other lang
  const switchPath = pathname.replace(`/${lang}`, `/${otherLang}`) || `/${otherLang}`;

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          href={`/${lang}`}
          className="text-lg font-bold tracking-tight text-green-700 dark:text-green-400"
        >
          JY Tech News
        </Link>
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path !== `/${lang}` && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
          <Link
            href={switchPath}
            className="ml-2 rounded-lg border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {otherLang === "en" ? "EN" : "中文"}
          </Link>
        </div>
      </div>
    </nav>
  );
}
