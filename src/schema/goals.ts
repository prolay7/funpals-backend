import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";

export const goalsTable = pgTable("goals",{
     id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
     userId:integer("userId").notNull().references(()=>usersTable.id),
     goal:text("goal").notNull(),
     isCompleted:boolean("isCompleted").notNull().default(false),
     completedOn:timestamp("completedOn"),
     ...timestamps
})