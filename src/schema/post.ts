import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";

export const openPostsTable = pgTable("open_posts", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => usersTable.id),
    title: varchar('title', { length: 120 }).notNull(),
    content: text('content').notNull(),
    tags: text('tags'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps
});
