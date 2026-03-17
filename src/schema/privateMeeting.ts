import { integer, pgTable, text, boolean,varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./user";
import { timestamps } from "./timestamp";

export const privateMeetingTable = pgTable("private_meetings", {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  invitedUserId: integer('invited_user_id').references(():any => usersTable.id).notNull(),
  streamCallId:text('stream_call_id'),
  isCussWordOn:boolean('is_cuss_word_on').notNull().default(false),
  createdBy: integer('created_by').references(():any => usersTable.id).notNull(),
  ...timestamps
});
