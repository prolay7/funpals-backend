import { integer, pgTable } from "drizzle-orm/pg-core";
import { db } from "../lib/db";
import { usersTable } from "./user";
import { groupsTable } from "./group";
import { timestamps } from "./timestamp";

export const groupMembersTable = pgTable('group_members', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    groupId: integer('group_id').notNull().references(()=>groupsTable.id),
    userId: integer('user_id').notNull().references(()=>usersTable.id),
    ...timestamps
});