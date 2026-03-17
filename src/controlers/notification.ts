import { Request, Response } from "express";
import { db } from "../lib/db";
import { notificationsTable, usersTable } from "../schema";
import { and, desc, eq } from "drizzle-orm";
import { notificationService, SYSTEM_NOTIFICATION_TYPE } from "../firebase/notification";

export const getNotifications: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 30;
        const offset = (page - 1) * limit;

        const notifications = await db
            .select()
            .from(notificationsTable)
            .where(eq(notificationsTable.userId, id))
            .orderBy(desc(notificationsTable.createdAt))
            .limit(limit + 1)
            .offset(offset);

        const hasMore = notifications.length > limit;
        if (hasMore) notifications.pop();

        return res.status(200).json({
            success: true,
            message: 'Notifications fetched successfully',
            notifications,
            hasMore,
            nextPage: page + 1,
        });
    } catch (error) {
        console.log('Error fetching notifications:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const markAllRead: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        await db
            .update(notificationsTable)
            .set({ isRead: true })
            .where(and(eq(notificationsTable.userId, id), eq(notificationsTable.isRead, false)));

        return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.log('Error marking notifications as read:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createNotification = async (
    userId: number,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>
) => {
    try {
        await db.insert(notificationsTable).values({
            userId,
            type,
            title,
            body,
            data: data ? JSON.stringify(data) : null,
            sentAt: new Date(),
        });

        const [user] = await db
            .select({ fcmToken: usersTable.fcmToken, notificationFrequency: usersTable.notificationFrequency })
            .from(usersTable)
            .where(eq(usersTable.id, userId))
            .limit(1);

        if (user?.fcmToken && user.notificationFrequency === 'immediate') {
            await notificationService.sendNotification(
                user.fcmToken,
                { title, message: body, image: '' },
                type ?? SYSTEM_NOTIFICATION_TYPE
            );
        }
    } catch (error) {
        console.log('Error creating notification:', error);
    }
};
