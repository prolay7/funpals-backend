import { integer, pgTable, text, boolean,varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";
import { categoriesTable } from "./category";

export const meetingTable = pgTable("meetings", {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  meetLink:text('meet_link'),
  streamCallId:text('stream_call_id'),
  numberOfUsers:integer('number_of_users').notNull().default(0),
  isActive:boolean('is_active').default(true),
  meetTitle:varchar('meet_title',{length:255}).notNull(),
  meetDescription:text('meet_description').notNull(),
  meetCategory:integer('meet_category').references(():any=>categoriesTable.id).notNull(),
  isSpecialCategory:boolean('is_special_category').notNull().default(false),
  isCussWordOn:boolean('is_cuss_word_on').notNull().default(false),
  createdBy: integer('created_by').references(():any => usersTable.id).notNull(),
  ...timestamps
});
