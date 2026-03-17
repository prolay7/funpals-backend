import { relations } from "drizzle-orm/relations";
import { meetings, users, messages, conversations, categories, likedUsers, userLikedCategories, verifications, reports, groups, groupMembers, groupMessages, skills, issues, groupMeetings, media, goals } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	meeting: one(meetings, {
		fields: [users.lastJoinedMeet],
		references: [meetings.id],
		relationName: "users_lastJoinedMeet_meetings_id"
	}),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_users_id"
	}),
	messages_receiverId: many(messages, {
		relationName: "messages_receiverId_users_id"
	}),
	conversations_userA: many(conversations, {
		relationName: "conversations_userA_users_id"
	}),
	conversations_userB: many(conversations, {
		relationName: "conversations_userB_users_id"
	}),
	meetings: many(meetings, {
		relationName: "meetings_createdBy_users_id"
	}),
	likedUsers_userId: many(likedUsers, {
		relationName: "likedUsers_userId_users_id"
	}),
	likedUsers_likedUserId: many(likedUsers, {
		relationName: "likedUsers_likedUserId_users_id"
	}),
	userLikedCategories: many(userLikedCategories),
	verifications_forUser: many(verifications, {
		relationName: "verifications_forUser_users_id"
	}),
	verifications_byUser: many(verifications, {
		relationName: "verifications_byUser_users_id"
	}),
	reports_reporterId: many(reports, {
		relationName: "reports_reporterId_users_id"
	}),
	reports_reportedId: many(reports, {
		relationName: "reports_reportedId_users_id"
	}),
	groupMembers: many(groupMembers),
	groupMessages: many(groupMessages),
	skills: many(skills),
	issues_userId: many(issues, {
		relationName: "issues_userId_users_id"
	}),
	issues_resolvedBy: many(issues, {
		relationName: "issues_resolvedBy_users_id"
	}),
	groupMeetings: many(groupMeetings),
	goals: many(goals),
}));

export const meetingsRelations = relations(meetings, ({one, many}) => ({
	users: many(users, {
		relationName: "users_lastJoinedMeet_meetings_id"
	}),
	category: one(categories, {
		fields: [meetings.meetCategory],
		references: [categories.id]
	}),
	user: one(users, {
		fields: [meetings.createdBy],
		references: [users.id],
		relationName: "meetings_createdBy_users_id"
	}),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	user_senderId: one(users, {
		fields: [messages.senderId],
		references: [users.id],
		relationName: "messages_senderId_users_id"
	}),
	user_receiverId: one(users, {
		fields: [messages.receiverId],
		references: [users.id],
		relationName: "messages_receiverId_users_id"
	}),
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id],
		relationName: "messages_conversationId_conversations_id"
	}),
	conversations: many(conversations, {
		relationName: "conversations_lastMessageId_messages_id"
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	messages: many(messages, {
		relationName: "messages_conversationId_conversations_id"
	}),
	user_userA: one(users, {
		fields: [conversations.userA],
		references: [users.id],
		relationName: "conversations_userA_users_id"
	}),
	user_userB: one(users, {
		fields: [conversations.userB],
		references: [users.id],
		relationName: "conversations_userB_users_id"
	}),
	message: one(messages, {
		fields: [conversations.lastMessageId],
		references: [messages.id],
		relationName: "conversations_lastMessageId_messages_id"
	}),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	category: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_parentId_categories_id"
	}),
	categories: many(categories, {
		relationName: "categories_parentId_categories_id"
	}),
	meetings: many(meetings),
	userLikedCategories: many(userLikedCategories),
	issues: many(issues),
	media: many(media),
}));

export const likedUsersRelations = relations(likedUsers, ({one}) => ({
	user_userId: one(users, {
		fields: [likedUsers.userId],
		references: [users.id],
		relationName: "likedUsers_userId_users_id"
	}),
	user_likedUserId: one(users, {
		fields: [likedUsers.likedUserId],
		references: [users.id],
		relationName: "likedUsers_likedUserId_users_id"
	}),
}));

export const userLikedCategoriesRelations = relations(userLikedCategories, ({one}) => ({
	user: one(users, {
		fields: [userLikedCategories.userId],
		references: [users.id]
	}),
	category: one(categories, {
		fields: [userLikedCategories.categoryId],
		references: [categories.id]
	}),
}));

export const verificationsRelations = relations(verifications, ({one}) => ({
	user_forUser: one(users, {
		fields: [verifications.forUser],
		references: [users.id],
		relationName: "verifications_forUser_users_id"
	}),
	user_byUser: one(users, {
		fields: [verifications.byUser],
		references: [users.id],
		relationName: "verifications_byUser_users_id"
	}),
}));

export const reportsRelations = relations(reports, ({one}) => ({
	user_reporterId: one(users, {
		fields: [reports.reporterId],
		references: [users.id],
		relationName: "reports_reporterId_users_id"
	}),
	user_reportedId: one(users, {
		fields: [reports.reportedId],
		references: [users.id],
		relationName: "reports_reportedId_users_id"
	}),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	group: one(groups, {
		fields: [groupMembers.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [groupMembers.userId],
		references: [users.id]
	}),
}));

export const groupsRelations = relations(groups, ({many}) => ({
	groupMembers: many(groupMembers),
	groupMessages: many(groupMessages),
	groupMeetings: many(groupMeetings),
}));

export const groupMessagesRelations = relations(groupMessages, ({one}) => ({
	group: one(groups, {
		fields: [groupMessages.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [groupMessages.userId],
		references: [users.id]
	}),
}));

export const skillsRelations = relations(skills, ({one}) => ({
	user: one(users, {
		fields: [skills.userId],
		references: [users.id]
	}),
}));

export const issuesRelations = relations(issues, ({one}) => ({
	user_userId: one(users, {
		fields: [issues.userId],
		references: [users.id],
		relationName: "issues_userId_users_id"
	}),
	category: one(categories, {
		fields: [issues.category],
		references: [categories.id]
	}),
	user_resolvedBy: one(users, {
		fields: [issues.resolvedBy],
		references: [users.id],
		relationName: "issues_resolvedBy_users_id"
	}),
}));

export const groupMeetingsRelations = relations(groupMeetings, ({one}) => ({
	group: one(groups, {
		fields: [groupMeetings.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [groupMeetings.createdBy],
		references: [users.id]
	}),
}));

export const mediaRelations = relations(media, ({one}) => ({
	category: one(categories, {
		fields: [media.categoryId],
		references: [categories.id]
	}),
}));

export const goalsRelations = relations(goals, ({one}) => ({
	user: one(users, {
		fields: [goals.userId],
		references: [users.id]
	}),
}));