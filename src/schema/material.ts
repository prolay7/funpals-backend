import { boolean, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./timestamp";

export const materialsTable = pgTable("materials", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    category: varchar('category', { length: 100 }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    imageUrl: text('image_url'),
    externalUrl: text('external_url'),
    address: text('address'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps
});
