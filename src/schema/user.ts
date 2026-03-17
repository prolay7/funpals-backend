import { integer, pgTable, text, varchar,pgEnum, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { meetingTable } from "./meeting";
import { timestamps } from "./timestamp";
import { customType } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum('status', ['online', 'offline', 'busy']);

export const geography = customType<any>({
  dataType() {
    return "geography(Point,4326)";
  },
});

export const usersTable = pgTable("users", {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name',{ length: 255 }).notNull(),
  email: varchar('email',{ length: 255 }).notNull().unique(),
  googlerefreshtoken:varchar('google_refresh_token',{length:255}),
  agerange: integer('age_range'),
  numberOfUsersMarkedasVerified:integer('number_of_users_marked_as_verified').notNull().default(0),
  profilephoto:text('profile_photo'),
  lastJoinedMeet:integer('last_joined_meet').references(():any=>meetingTable.id),
  isCussWordOn:boolean('is_cuss_word_on').notNull().default(false),
  isSpecialCategoryOptIn:boolean('is_special_category_opt_in').notNull().default(false),
  fcmToken:text('fcm_token'),
  isAccountActive:boolean('is_account_active').notNull().default(true),
  lastUpdatedBy:integer('last_updated_by'),
  nextAvailability:integer('next_availability'),
  location: geography("location"),
  locationDisplayName:text("location_display_name"),
  bio: text('bio'),
  canDo: text('can_do'),
  cannotDo: text('cannot_do'),
  interests: text('interests'),
  availableFor: text('available_for'),
  expertiseLevel: integer('expertise_level'),
  zipCode: varchar('zip_code', { length: 20 }),
  gender: varchar('gender', { length: 20 }),
  notificationFrequency: varchar('notification_frequency', { length: 20 }).notNull().default('batched'),
  ...timestamps
});
