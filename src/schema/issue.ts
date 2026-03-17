import { boolean, integer,  pgTable, text, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./timestamp";
import { categoriesTable } from "./category";
import { usersTable } from "./user";
import { ISSUE_STATUS } from "../lib/constants";

export const issueTable = pgTable("issues",{
    id:integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId:integer("user_id").notNull().references(()=>usersTable.id),
    title: varchar("title").notNull(),
    description: text("description").notNull(),
    status:integer("status").notNull().default(ISSUE_STATUS.OPEN),
    isPublic: boolean("is_public").notNull().default(false),
    category: integer("category").notNull().references(()=>categoriesTable.id),
    resolvedBy: integer("resolved_by").references(()=>usersTable.id),
    ...timestamps
})