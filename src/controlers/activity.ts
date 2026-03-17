import { Request, Response } from "express";
import { db } from "../lib/db";
import { activitiesTable, activityCategoriesTable, userActivitiesTable } from "../schema";
import { and, asc, eq, sql } from "drizzle-orm";

export const listActivities: any = async (req: Request, res: Response) => {
    try {
        const { category } = req.query;

        const query = db
            .select({
                id: activitiesTable.id,
                title: activitiesTable.title,
                description: activitiesTable.description,
                imageUrl: activitiesTable.imageUrl,
                address: activitiesTable.address,
                externalUrl: activitiesTable.externalUrl,
                sortOrder: activitiesTable.sortOrder,
                categoryId: activityCategoriesTable.id,
                categoryName: activityCategoriesTable.name,
                categoryIcon: activityCategoriesTable.icon,
            })
            .from(activitiesTable)
            .leftJoin(activityCategoriesTable, eq(activitiesTable.categoryId, activityCategoriesTable.id))
            .where(
                category
                    ? and(eq(activitiesTable.isActive, true), eq(activityCategoriesTable.name, String(category)))
                    : eq(activitiesTable.isActive, true)
            )
            .orderBy(asc(activitiesTable.sortOrder));

        const activities = await query;
        return res.status(200).json({ success: true, message: 'Activities fetched', activities });
    } catch (error) {
        console.log('Error fetching activities:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getRandomActivity: any = async (req: Request, res: Response) => {
    try {
        const [activity] = await db
            .select({
                id: activitiesTable.id,
                title: activitiesTable.title,
                description: activitiesTable.description,
                imageUrl: activitiesTable.imageUrl,
                address: activitiesTable.address,
                externalUrl: activitiesTable.externalUrl,
                categoryId: activityCategoriesTable.id,
                categoryName: activityCategoriesTable.name,
                categoryIcon: activityCategoriesTable.icon,
            })
            .from(activitiesTable)
            .leftJoin(activityCategoriesTable, eq(activitiesTable.categoryId, activityCategoriesTable.id))
            .where(eq(activitiesTable.isActive, true))
            .orderBy(sql`RANDOM()`)
            .limit(1);

        if (!activity) return res.status(404).json({ success: false, message: 'No activities found' });
        return res.status(200).json({ success: true, message: 'Random activity fetched', activity });
    } catch (error) {
        console.log('Error fetching random activity:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getActivityById: any = async (req: Request, res: Response) => {
    try {
        const activityId = Number(req.params.id);
        if (!activityId) return res.status(400).json({ success: false, message: 'Invalid activity id' });

        const [activity] = await db
            .select({
                id: activitiesTable.id,
                title: activitiesTable.title,
                description: activitiesTable.description,
                imageUrl: activitiesTable.imageUrl,
                address: activitiesTable.address,
                externalUrl: activitiesTable.externalUrl,
                categoryId: activityCategoriesTable.id,
                categoryName: activityCategoriesTable.name,
                categoryIcon: activityCategoriesTable.icon,
            })
            .from(activitiesTable)
            .leftJoin(activityCategoriesTable, eq(activitiesTable.categoryId, activityCategoriesTable.id))
            .where(eq(activitiesTable.id, activityId))
            .limit(1);

        if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
        return res.status(200).json({ success: true, message: 'Activity fetched', activity });
    } catch (error) {
        console.log('Error fetching activity:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const joinActivity: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const activityId = Number(req.params.id);
        if (!activityId) return res.status(400).json({ success: false, message: 'Invalid activity id' });

        await db
            .insert(userActivitiesTable)
            .values({ userId: id, activityId, status: 'ongoing', startedAt: new Date() })
            .onConflictDoUpdate({
                target: [userActivitiesTable.userId, userActivitiesTable.activityId],
                set: { status: 'ongoing', startedAt: new Date() },
            });

        return res.status(200).json({ success: true, message: 'Joined activity successfully' });
    } catch (error) {
        console.log('Error joining activity:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
