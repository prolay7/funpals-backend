import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { usersTable } from './user';
import { timestamps } from './timestamp';
import { conversationsTable } from './conversation';

export const messagesTable = pgTable('messages', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  senderId: integer('sender_id').notNull().references(():any=>usersTable.id),
  receiverId:integer('receiver_id').notNull().references(():any=>usersTable.id),
  convresation:integer('conversation_id').notNull().references(():any=>conversationsTable.id),
  content: text('content').notNull(),
  ...timestamps
});
