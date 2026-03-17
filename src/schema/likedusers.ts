import { pgTable, integer } from 'drizzle-orm/pg-core';
import { usersTable } from './user';
import { timestamps } from './timestamp';

export const likedUsersTable = pgTable('likedUsers', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  userId: integer('user_id').notNull().references(():any=>usersTable.id),
  likedUserId: integer('liked_user_id').notNull().references(():any=>usersTable.id),
  ...timestamps
});
