import { integer, pgTable, primaryKey, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { groupsTable } from "./group";

export const favoriteCallersTable = pgTable("favorite_callers", {
    userId: integer('user_id').notNull().references(() => usersTable.id),
    favoriteUserId: integer('favorite_user_id').notNull().references(() => usersTable.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    primaryKey({ columns: [t.userId, t.favoriteUserId] })
]);

export const favoriteGroupsTable = pgTable("favorite_groups", {
    userId: integer('user_id').notNull().references(() => usersTable.id),
    groupId: integer('group_id').notNull().references(() => groupsTable.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    primaryKey({ columns: [t.userId, t.groupId] })
]);
