import { text } from "drizzle-orm/pg-core";
import { integer, pgTable } from "drizzle-orm/pg-core";
import { timestamps } from "./timestamp";
import { usersTable } from "./user";

export const SkillsTable = pgTable("skills",{
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(():any=>usersTable.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: integer("status").notNull(),
    ...timestamps
});
