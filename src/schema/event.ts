import { boolean, integer, pgTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { groupsTable } from "./group";
import { timestamps } from "./timestamp";

export const eventsTable = pgTable("events", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    title: varchar('title', { length: 120 }).notNull(),
    description: text('description'),
    location: text('location'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    createdBy: integer('created_by').notNull().references(() => usersTable.id),
    groupId: integer('group_id').references(() => groupsTable.id),
    isGroup: boolean('is_group').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps
});

export const eventRsvpsTable = pgTable("event_rsvps", {
    eventId: integer('event_id').notNull().references(() => eventsTable.id),
    userId: integer('user_id').notNull().references(() => usersTable.id),
    status: varchar('status', { length: 20 }).notNull().default('going'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    primaryKey({ columns: [t.eventId, t.userId] })
]);
