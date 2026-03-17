import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { timestamps } from "./timestamp";
import { categoriesTable } from "./category";

export const mediaTable = pgTable("media",{
     id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
     categoryId:integer("categoryId").notNull().references(()=>categoriesTable.id),
     url:text("url").notNull(),
     title:text("title").notNull(),
     description:text("description").notNull(),
     type:integer("type").notNull(),
     ...timestamps
})