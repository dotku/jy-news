import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidLang, getDictionary, locales, type Lang } from "@/lib/i18n";
import Navigator from "@/components/Navigator";

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
    title: `${t.siteName}${t.siteNameCn ? " - " + t.siteNameCn : ""}`,
    description: `${t.siteName}${t.siteNameCn ? "（" + t.siteNameCn + "）" : ""} — ${t.siteDesc}`,
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLang(lang)) notFound();

  return (
    <>
      <Navigator lang={lang as Lang} />
      {children}
    </>
  );
}
