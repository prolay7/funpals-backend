import { boolean, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";

export const notificationsTable = pgTable("notifications", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => usersTable.id),
    type: varchar('type', { length: 100 }).notNull(),
    title: text('title').notNull(),
    body: text('body'),
    data: text('data'),
    isRead: boolean('is_read').notNull().default(false),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
