import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于 - JY Tech News 杰圆科技新闻",
  description: "关于 JY Tech News（杰圆科技新闻）— 我们是谁，我们做什么",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        关于 JY Tech News 杰圆科技新闻
      </h1>

      <div className="mt-8 space-y-6 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p>
          <strong className="text-zinc-900 dark:text-zinc-100">JY Tech News（杰圆科技新闻）</strong>是一个专注于全球科技资讯的新闻平台，致力于为读者提供高质量、及时的科技行业动态
        </p>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            我们关注的领域
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "人工智能", icon: "🤖" },
              { label: "科学探索", icon: "🔬" },
              { label: "消费电子", icon: "📱" },
              { label: "加密货币", icon: "💰" },
              { label: "软件工程", icon: "💻" },
              { label: "创业投资", icon: "🚀" },
            ].map((item) => (
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
            技术栈
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Next.js 16 · React 19 · TypeScript · Tailwind CSS · MDX ·
            Drizzle ORM · Neon Postgres · Cloudflare R2 · Vercel
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            内容覆盖
          </h2>
          <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              全球科技新闻与行业资讯
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              行业领袖观点与动态
            </li>
          </ul>
        </div>

        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          由{" "}
          <a
            href="https://jytech.us"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 hover:underline dark:text-green-400"
          >
            JYTech
          </a>{" "}
          构建与维护
        </p>
      </div>
    </main>
  );
}
