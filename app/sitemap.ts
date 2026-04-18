import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";
import { locales } from "@/lib/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://news.jytech.us";
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  for (const lang of locales) {
    entries.push({
      url: `${baseUrl}/${lang}`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    });
    entries.push({
      url: `${baseUrl}/${lang}/voices`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    });
    entries.push({
      url: `${baseUrl}/${lang}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  // Article pages
  for (const lang of locales) {
    const articles = getAllArticles(lang);
    for (const article of articles) {
      entries.push({
        url: `${baseUrl}/${lang}/article/${article.slug}`,
        lastModified: article.date ? new Date(article.date) : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
