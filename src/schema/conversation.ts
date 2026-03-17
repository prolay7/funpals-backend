import { integer, pgTable, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";
import { messagesTable } from "./message";

export const conversationsTable = pgTable("conversations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  usera: integer("user_a").notNull().references((): any => usersTable.id),
  userb: integer("user_b").notNull().references((): any => usersTable.id),
  lastmessage: integer("last_message_id").references((): any => messagesTable.id),
  ...timestamps
}, (table) => ({
  userPairUnique: unique().on(table.usera, table.userb),
}));


//between usera and userb the smaller number will be always in usera