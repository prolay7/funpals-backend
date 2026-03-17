import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { groupsTable } from "./group";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";

export const groupMessageTable = pgTable("group_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id),
  senderId: integer("user_id").notNull().references(() => usersTable.id),
  senderName: text("sender_name").notNull(),
  senderProfileImage: text("sender_profile_image").notNull(),
  content: text("content").notNull(),
   ...timestamps
});