import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { groupsTable } from "./group";

export const sharesTable = pgTable("shares", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => usersTable.id),
    content: text('content').notNull(),
    category: varchar('category', { length: 100 }),
    shareType: varchar('share_type', { length: 20 }).notNull().default('global'),
    groupId: integer('group_id').references(() => groupsTable.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
