import { pgTable, serial, integer, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { categoriesTable } from "./category";


export const userLikedCategoriesTable = pgTable("userLikedCategories", {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => usersTable.id).notNull(),
  categoryId: integer('category_id').references(() => categoriesTable.id).notNull(),
}, (table) => ({
  uniqueUserCategory: unique().on(table.userId, table.categoryId),
}));
