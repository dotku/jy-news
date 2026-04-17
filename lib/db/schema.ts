import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const articleStats = pgTable("article_stats", {
  slug: text("slug").primaryKey(),
  views: integer("views").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
