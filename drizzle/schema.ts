import { pgTable, type AnyPgColumn, index, foreignKey, unique, integer, varchar, text, boolean, timestamp, serial, check, pgView, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const status = pgEnum("status", ['online', 'offline', 'busy'])


export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	googleRefreshToken: varchar("google_refresh_token", { length: 255 }),
	ageRange: integer("age_range"),
	numberOfUsersMarkedAsVerified: integer("number_of_users_marked_as_verified").default(0).notNull(),
	profilePhoto: text("profile_photo"),
	lastJoinedMeet: integer("last_joined_meet"),
	isCussWordOn: boolean("is_cuss_word_on").default(false).notNull(),
	isSpecialCategoryOptIn: boolean("is_special_category_opt_in").default(false).notNull(),
	fcmToken: text("fcm_token"),
	isAccountActive: boolean("is_account_active").default(true).notNull(),
	lastUpdatedBy: integer("last_updated_by"),
	nextAvailability: integer("next_availability"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	locationDisplayName: text("location_display_name"),
	// TODO: failed to parse database type 'geography'
	location: unknown("location"),
}, (table) => [
	index("idx_users_name_active").using("btree", table.name.asc().nullsLast().op("text_ops")).where(sql`(is_account_active = true)`),
	foreignKey({
			columns: [table.lastJoinedMeet],
			foreignColumns: [meetings.id],
			name: "users_last_joined_meet_meetings_id_fk"
		}),
	unique("users_email_unique").on(table.email),
]);

export const messages = pgTable("messages", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "messages_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	senderId: integer("sender_id").notNull(),
	receiverId: integer("receiver_id").notNull(),
	conversationId: integer("conversation_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "messages_sender_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.receiverId],
			foreignColumns: [users.id],
			name: "messages_receiver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_conversations_id_fk"
		}),
]);

export const conversations = pgTable("conversations", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "conversations_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userA: integer("user_a").notNull(),
	userB: integer("user_b").notNull(),
	lastMessageId: integer("last_message_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userA],
			foreignColumns: [users.id],
			name: "conversations_user_a_users_id_fk"
		}),
	foreignKey({
			columns: [table.userB],
			foreignColumns: [users.id],
			name: "conversations_user_b_users_id_fk"
		}),
	foreignKey({
			columns: [table.lastMessageId],
			foreignColumns: [messages.id],
			name: "conversations_last_message_id_messages_id_fk"
		}),
	unique("conversations_user_a_user_b_unique").on(table.userA, table.userB),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	parentId: integer("parent_id"),
	details: text(),
	isSpecial: boolean("is_special"),
	depth: integer().notNull(),
	level: integer().notNull(),
	priority: integer().default(999999).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_categories_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "categories_parent_id_categories_id_fk"
		}),
]);

export const meetings = pgTable("meetings", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "meetings_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	meetLink: text("meet_link"),
	streamCallId: text("stream_call_id"),
	numberOfUsers: integer("number_of_users").default(0).notNull(),
	isActive: boolean("is_active").default(false),
	meetTitle: varchar("meet_title", { length: 255 }).notNull(),
	meetDescription: text("meet_description").notNull(),
	meetCategory: integer("meet_category").notNull(),
	isSpecialCategory: boolean("is_special_category").default(false).notNull(),
	isCussWordOn: boolean("is_cuss_word_on").default(false).notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_meetings_description_active").using("btree", table.meetDescription.asc().nullsLast().op("text_ops")).where(sql`(is_active = true)`),
	index("idx_meetings_title_active").using("btree", table.meetTitle.asc().nullsLast().op("text_ops")).where(sql`(is_active = true)`),
	foreignKey({
			columns: [table.meetCategory],
			foreignColumns: [categories.id],
			name: "meetings_meet_category_categories_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "meetings_created_by_users_id_fk"
		}),
]);

export const likedUsers = pgTable("likedUsers", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: ""likedUsers_id_seq"", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647 }),
	userId: integer("user_id").notNull(),
	likedUserId: integer("liked_user_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "likedUsers_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.likedUserId],
			foreignColumns: [users.id],
			name: "likedUsers_liked_user_id_users_id_fk"
		}),
]);

export const userLikedCategories = pgTable("userLikedCategories", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	categoryId: integer("category_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "userLikedCategories_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "userLikedCategories_category_id_categories_id_fk"
		}),
	unique("userLikedCategories_user_id_category_id_unique").on(table.userId, table.categoryId),
]);

export const verifications = pgTable("verifications", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "verifications_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	forUser: integer().notNull(),
	byUser: integer().notNull(),
	verified: boolean().notNull(),
	ageRange: integer("age_range").default(0).notNull(),
	gender: integer().default(0).notNull(),
	remark: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.forUser],
			foreignColumns: [users.id],
			name: "verifications_forUser_users_id_fk"
		}),
	foreignKey({
			columns: [table.byUser],
			foreignColumns: [users.id],
			name: "verifications_byUser_users_id_fk"
		}),
]);

export const reports = pgTable("reports", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "reports_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	reporterId: integer("reporter_id").notNull(),
	reportedId: integer("reported_id").notNull(),
	reason: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "reports_reporter_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.reportedId],
			foreignColumns: [users.id],
			name: "reports_reported_id_users_id_fk"
		}),
]);

export const groups = pgTable("groups", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "groups_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	groupName: text("group_name").notNull(),
	description: text().notNull(),
	groupImage: text("group_image").notNull(),
	createdBy: integer("created_by").notNull(),
	groupRules: text("group_rules").notNull(),
	lastMessage: timestamp("last_message", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_groups_name").using("btree", table.groupName.asc().nullsLast().op("text_ops")),
]);

export const groupMembers = pgTable("group_members", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "group_members_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	groupId: integer("group_id").notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_members_group_id_groups_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_members_user_id_users_id_fk"
		}),
]);

export const groupMessages = pgTable("group_messages", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "group_messages_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	groupId: integer("group_id").notNull(),
	userId: integer("user_id").notNull(),
	senderName: text("sender_name").notNull(),
	senderProfileImage: text("sender_profile_image").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_messages_group_id_groups_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "group_messages_user_id_users_id_fk"
		}),
]);

export const skills = pgTable("skills", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "skills_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer("user_id").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	status: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_skills_title").using("btree", table.title.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "skills_user_id_users_id_fk"
		}),
]);

export const issues = pgTable("issues", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "issues_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer("user_id").notNull(),
	title: varchar().notNull(),
	description: text().notNull(),
	status: integer().default(0).notNull(),
	isPublic: boolean("is_public").default(false).notNull(),
	category: integer().notNull(),
	resolvedBy: integer("resolved_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_issues_description_public").using("btree", table.description.asc().nullsLast().op("text_ops")).where(sql`(is_public = true)`),
	index("idx_issues_title_public").using("btree", table.title.asc().nullsLast().op("text_ops")).where(sql`(is_public = true)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "issues_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.category],
			foreignColumns: [categories.id],
			name: "issues_category_categories_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [users.id],
			name: "issues_resolved_by_users_id_fk"
		}),
]);

export const groupMeetings = pgTable("group_meetings", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "group_meetings_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	groupId: integer("group_id").notNull(),
	meetingLink: text("meeting_link"),
	streamCallId: text("stream_call_id"),
	meetingStartTime: timestamp("meeting_start_time", { mode: 'string' }).notNull(),
	meetingEndTime: timestamp("meeting_end_time", { mode: 'string' }).notNull(),
	meetingTitle: text("meeting_title").notNull(),
	meetingDescription: text("meeting_description").notNull(),
	createdBy: integer("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [groups.id],
			name: "group_meetings_group_id_groups_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "group_meetings_created_by_users_id_fk"
		}),
]);

export const media = pgTable("media", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "media_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	categoryId: integer().notNull(),
	url: text().notNull(),
	title: text().notNull(),
	description: text().notNull(),
	type: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "media_categoryId_categories_id_fk"
		}),
]);

export const goals = pgTable("goals", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "goals_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	userId: integer().notNull(),
	goal: text().notNull(),
	isCompleted: boolean().default(false).notNull(),
	completedOn: timestamp({ mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "goals_userId_users_id_fk"
		}),
]);

export const spatialRefSys = pgTable("spatial_ref_sys", {
	srid: integer().notNull(),
	authName: varchar("auth_name", { length: 256 }),
	authSrid: integer("auth_srid"),
	srtext: varchar({ length: 2048 }),
	proj4Text: varchar({ length: 2048 }),
}, (table) => [
	check("spatial_ref_sys_srid_check", sql`(srid > 0) AND (srid <= 998999)`),
]);
export const geographyColumns = pgView("geography_columns", {	// TODO: failed to parse database type 'name'
	fTableCatalog: unknown("f_table_catalog"),
	// TODO: failed to parse database type 'name'
	fTableSchema: unknown("f_table_schema"),
	// TODO: failed to parse database type 'name'
	fTableName: unknown("f_table_name"),
	// TODO: failed to parse database type 'name'
	fGeographyColumn: unknown("f_geography_column"),
	coordDimension: integer("coord_dimension"),
	srid: integer(),
	type: text(),
}).as(sql`SELECT current_database() AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geography_column, postgis_typmod_dims(a.atttypmod) AS coord_dimension, postgis_typmod_srid(a.atttypmod) AS srid, postgis_typmod_type(a.atttypmod) AS type FROM pg_class c, pg_attribute a, pg_type t, pg_namespace n WHERE t.typname = 'geography'::name AND a.attisdropped = false AND a.atttypid = t.oid AND a.attrelid = c.oid AND c.relnamespace = n.oid AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text)`);

export const geometryColumns = pgView("geometry_columns", {	fTableCatalog: varchar("f_table_catalog", { length: 256 }),
	// TODO: failed to parse database type 'name'
	fTableSchema: unknown("f_table_schema"),
	// TODO: failed to parse database type 'name'
	fTableName: unknown("f_table_name"),
	// TODO: failed to parse database type 'name'
	fGeometryColumn: unknown("f_geometry_column"),
	coordDimension: integer("coord_dimension"),
	srid: integer(),
	type: varchar({ length: 30 }),
}).as(sql`SELECT current_database()::character varying(256) AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geometry_column, COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension, COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid, replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped JOIN pg_namespace n ON c.relnamespace = n.oid JOIN pg_type t ON a.atttypid = t.oid LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ''''::text, 2), ')'::text, ''::text) AS type FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%geometrytype(% = %'::text) st ON st.connamespace = n.oid AND st.conrelid = c.oid AND (a.attnum = ANY (st.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text)::integer AS ndims FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%ndims(% = %'::text) sn ON sn.connamespace = n.oid AND sn.conrelid = c.oid AND (a.attnum = ANY (sn.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text), '('::text, ''::text)::integer AS srid FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%srid(% = %'::text) sr ON sr.connamespace = n.oid AND sr.conrelid = c.oid AND (a.attnum = ANY (sr.conkey)) WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text)`);