import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";

export const openQuestionsTable = pgTable("open_questions", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => usersTable.id),
    question: text('question').notNull(),
    tags: text('tags'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps
});
