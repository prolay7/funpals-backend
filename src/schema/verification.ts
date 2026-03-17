import { integer, pgTable,text, boolean } from "drizzle-orm/pg-core";
import { timestamps } from "./timestamp";
import { usersTable } from "./user";

export const verificationsTable = pgTable("verifications", {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    forUser: integer('forUser').notNull().references(() => usersTable.id),
    byUser: integer('byUser').notNull().references(() => usersTable.id),
    verified: boolean('verified').notNull(),
    ageRange:integer('age_range').notNull().default(0),
    gender:integer('gender').notNull().default(0),
    remark:text('remark').notNull(),
    ...timestamps
});