import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./timestamp";


export const groupsTable = pgTable("groups", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    groupName: text("group_name").notNull(),
    description: text("description").notNull(),
    groupImage: text("group_image").notNull(),
    createdBy: integer("created_by").notNull(),
    groupRules: text("group_rules").notNull(),
    lastMessage: timestamp("last_message").notNull(),
    ...timestamps
});
