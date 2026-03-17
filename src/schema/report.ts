import { pgTable, text, integer } from 'drizzle-orm/pg-core';
import { usersTable } from './user';
import { timestamps } from './timestamp';

export const reportTable = pgTable('reports', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  reporterId: integer('reporter_id').notNull().references((): any => usersTable.id),
  reportedToId: integer('reported_id').notNull().references((): any => usersTable.id),
  reason: text('reason').notNull(),
  ...timestamps
});
