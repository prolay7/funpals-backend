import { boolean, integer, pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";

export const activityCategoriesTable = pgTable("activity_categories", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    icon: text('icon'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const activitiesTable = pgTable("activities", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    categoryId: integer('category_id').references(() => activityCategoriesTable.id),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    address: text('address'),
    externalUrl: text('external_url'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps
});

export const userActivitiesTable = pgTable("user_activities", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => usersTable.id),
    activityId: integer('activity_id').notNull().references(() => activitiesTable.id),
    status: varchar('status', { length: 50 }).notNull().default('available'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
    unique().on(t.userId, t.activityId)
]);
