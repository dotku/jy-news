"use client";

import { useEffect, useState } from "react";

type Lang = "zh" | "en";

const units: { label: [string, string]; seconds: number }[] = [
  { label: ["年", "y"], seconds: 31536000 },
  { label: ["个月", "mo"], seconds: 2592000 },
  { label: ["周", "w"], seconds: 604800 },
  { label: ["天", "d"], seconds: 86400 },
  { label: ["小时", "h"], seconds: 3600 },
  { label: ["分钟", "m"], seconds: 60 },
];

function calcTimeAgo(dateInput: string | Date, lang: Lang): string {
  let dateStr = String(dateInput || "");
  if (!dateStr || dateStr.includes("加载")) return "";

  // cnbeta dates are Beijing time (UTC+8), append timezone if missing
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr) && !dateStr.includes("+") && !dateStr.includes("Z")) {
    dateStr = dateStr + "+08:00";
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 0) return "";
  if (diff < 60) return lang === "zh" ? "刚刚" : "just now";

  for (const unit of units) {
    const val = Math.floor(diff / unit.seconds);
    if (val >= 1) {
      return lang === "zh" ? `${val}${unit.label[0]}前` : `${val}${unit.label[1]} ago`;
    }
  }
  return "";
}

export default function TimeAgo({
  date,
  lang,
}: {
  date: string | Date;
  lang: Lang;
}) {
  // Initial render: show a simple fallback so SSG/SSR isn't empty
  const [text, setText] = useState(() => {
    try {
      return calcTimeAgo(date, lang);
    } catch {
      return "";
    }
  });

  // Re-calculate on client to get accurate "now"
  useEffect(() => {
    setText(calcTimeAgo(date, lang));
  }, [date, lang]);

  if (!text) return null;

  return <span className="text-xs text-zinc-400">{text}</span>;
}
