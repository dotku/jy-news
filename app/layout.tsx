import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JY Tech News - 杰圆科技新闻",
    template: "%s | JY Tech News",
  },
  description:
    "JY Tech News（杰圆科技新闻）— 精选全球科技新闻、AI、创业与行业洞察",
  metadataBase: new URL("https://news.jytech.us"),
  openGraph: {
    type: "website",
    siteName: "JY Tech News",
    locale: "zh_CN",
    alternateLocale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    languages: {
      "zh-CN": "/zh",
      "en-US": "/en",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 font-sans antialiased dark:bg-zinc-950`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
