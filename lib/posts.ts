import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content/posts");

export interface Post {
  slug: string;
  title: string;
  date: string;
  handle: string;
  name: string;
  authorTitle: string;
  category: string;
  isRT: boolean;
  originalAuthor: string;
  link: string;
  image: string;
  content: string;
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
    const { data, content } = matter(raw);

    return {
      slug: data.slug || file.replace(/\.mdx$/, ""),
      title: data.title || "",
      date: data.date || "",
      handle: data.handle || "",
      name: data.name || "",
      authorTitle: data.author_title || "",
      category: data.category || "",
      isRT: data.is_rt === true,
      originalAuthor: data.original_author || "",
      link: data.link || "",
      image: data.image || "",
      content: content.trim(),
    };
  });

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPostsByHandle(handle: string): Post[] {
  return getAllPosts().filter((p) => p.handle === handle);
}
