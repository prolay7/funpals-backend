import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./timestamp";
import { groupsTable } from "./group";
import { usersTable } from "./user";

export const groupMeetingsTable = pgTable("group_meetings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  groupId: integer("group_id").notNull().references((): any => groupsTable.id),
  meetLink: text("meeting_link"),
  streamCallId: text("stream_call_id"),
  meetingStartTime: timestamp("meeting_start_time").notNull(),
  meetingEndTime: timestamp("meeting_end_time").notNull(),
  meetTitle: text("meeting_title").notNull(),
  meetDescription: text("meeting_description").notNull(),
  createdBy: integer("created_by").notNull().references((): any => usersTable.id),
  ...timestamps
});
 