type Lang = "zh" | "en";

const units: { label: [string, string]; seconds: number }[] = [
  { label: ["年", "y"], seconds: 31536000 },
  { label: ["个月", "mo"], seconds: 2592000 },
  { label: ["周", "w"], seconds: 604800 },
  { label: ["天", "d"], seconds: 86400 },
  { label: ["小时", "h"], seconds: 3600 },
  { label: ["分钟", "m"], seconds: 60 },
];

export function timeAgo(dateStr: string, lang: Lang = "zh"): string | null {
  if (!dateStr || dateStr.includes("加载")) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 0) return null;

  if (diff < 60) {
    return lang === "zh" ? "刚刚" : "just now";
  }

  for (const unit of units) {
    const val = Math.floor(diff / unit.seconds);
    if (val >= 1) {
      if (lang === "zh") {
        return `${val}${unit.label[0]}前`;
      }
      return `${val}${unit.label[1]} ago`;
    }
  }

  return null;
}
