import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "./timestamp";

export const categoriesTable = pgTable("categories", {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parentId: integer('parent_id').references(():any => categoriesTable.id), 
  details: text('details'),
  isSpecial: boolean('is_special'),
  depth: integer('depth').notNull(),
  level:integer('level').notNull(),
  priority:integer('priority').default(999999).notNull(),
  ...timestamps
});