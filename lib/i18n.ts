export const locales = ["zh", "en"] as const;
export type Lang = (typeof locales)[number];
export const defaultLang: Lang = "zh";

export function isValidLang(lang: string): lang is Lang {
  return locales.includes(lang as Lang);
}

const dict = {
  zh: {
    siteName: "JY Tech News",
    siteNameCn: "杰圆科技新闻",
    siteDesc: "精选全球科技新闻、AI、创业与行业洞察",
    home: "首页",
    about: "关于",
    noArticles: "暂无文章，请稍后再来",
    backToList: "返回列表",
    readMore: "阅读更多",
    views: "阅读",
    likes: "点赞",
    aboutTitle: "关于 JY Tech News 杰圆科技新闻",
    aboutDesc:
      "JY Tech News（杰圆科技新闻）是一个专注于全球科技资讯的新闻平台，致力于为读者提供高质量、及时的科技行业动态",
    focusAreas: "我们关注的领域",
    techStack: "技术栈",
    coverage: "内容覆盖",
    coverageItems: ["全球科技新闻与行业资讯", "行业领袖观点与动态"],
    builtBy: "构建与维护",
    categories: {
      tech: "科技",
      science: "科学",
      game: "游戏",
      movie: "影视",
      soft: "软件",
      comic: "动漫",
      music: "音乐",
      fun: "趣闻",
    } as Record<string, string>,
    topics: [
      { label: "人工智能", icon: "🤖" },
      { label: "科学探索", icon: "🔬" },
      { label: "消费电子", icon: "📱" },
      { label: "加密货币", icon: "💰" },
      { label: "软件工程", icon: "💻" },
      { label: "创业投资", icon: "🚀" },
    ],
  },
  en: {
    siteName: "JY Tech News",
    siteNameCn: "",
    siteDesc:
      "Curated global tech news, AI, startups, and industry insights",
    home: "Home",
    about: "About",
    noArticles: "No articles yet, please check back later",
    backToList: "Back to list",
    readMore: "Read more",
    views: "Views",
    likes: "Likes",
    aboutTitle: "About JY Tech News",
    aboutDesc:
      "JY Tech News is a tech news platform focused on delivering high-quality, timely coverage of the global technology industry",
    focusAreas: "Focus Areas",
    techStack: "Tech Stack",
    coverage: "Coverage",
    coverageItems: [
      "Global tech news and industry updates",
      "Industry leader insights and trends",
    ],
    builtBy: "Built & maintained by",
    categories: {
      tech: "Tech",
      science: "Science",
      game: "Gaming",
      movie: "Film",
      soft: "Software",
      comic: "Anime",
      music: "Music",
      fun: "Fun",
    } as Record<string, string>,
    topics: [
      { label: "Artificial Intelligence", icon: "🤖" },
      { label: "Science", icon: "🔬" },
      { label: "Consumer Electronics", icon: "📱" },
      { label: "Cryptocurrency", icon: "💰" },
      { label: "Software Engineering", icon: "💻" },
      { label: "Startups & VC", icon: "🚀" },
    ],
  },
} as const;

export type Dict = (typeof dict)[Lang];

export function getDictionary(lang: Lang): Dict {
  return dict[lang] || dict.zh;
}
