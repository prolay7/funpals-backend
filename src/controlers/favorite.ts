import { Request, Response } from "express";
import { db } from "../lib/db";
import { favoriteCallersTable, favoriteGroupsTable, groupsTable, usersTable } from "../schema";
import { and, desc, eq } from "drizzle-orm";
import RedisClient from "../redis";
import { getUserKey } from "../redis/keys";

export const toggleFavoriteCaller: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const { targetUserId } = req.body;
        if (!targetUserId) return res.status(400).json({ success: false, message: 'targetUserId is required' });

        const [existing] = await db
            .select()
            .from(favoriteCallersTable)
            .where(and(eq(favoriteCallersTable.userId, id), eq(favoriteCallersTable.favoriteUserId, targetUserId)))
            .limit(1);

        if (existing) {
            await db
                .delete(favoriteCallersTable)
                .where(and(eq(favoriteCallersTable.userId, id), eq(favoriteCallersTable.favoriteUserId, targetUserId)));
            return res.status(200).json({ success: true, message: 'Removed from favorites', favorited: false });
        }

        await db.insert(favoriteCallersTable).values({ userId: id, favoriteUserId: targetUserId });
        return res.status(200).json({ success: true, message: 'Added to favorites', favorited: true });
    } catch (error) {
        console.log('Error toggling favorite caller:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const listFavoriteCallers: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;

        const callers = await db
            .select({
                userId: usersTable.id,
                name: usersTable.name,
                profilePhoto: usersTable.profilephoto,
                favoritedAt: favoriteCallersTable.createdAt,
            })
            .from(favoriteCallersTable)
            .leftJoin(usersTable, eq(favoriteCallersTable.favoriteUserId, usersTable.id))
            .where(and(eq(favoriteCallersTable.userId, id), eq(usersTable.isAccountActive, true)))
            .orderBy(desc(favoriteCallersTable.createdAt));

        const redis = RedisClient.getInstance();
        const callersWithStatus = await Promise.all(
            callers.map(async (caller) => {
                const status = caller.userId
                    ? await redis?.get(getUserKey(caller.userId))
                    : null;
                return { ...caller, status: status ?? 'offline' };
            })
        );

        return res.status(200).json({ success: true, message: 'Favorite callers fetched', callers: callersWithStatus });
    } catch (error) {
        console.log('Error fetching favorite callers:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const toggleFavoriteGroup: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const { groupId } = req.body;
        if (!groupId) return res.status(400).json({ success: false, message: 'groupId is required' });

        const [existing] = await db
            .select()
            .from(favoriteGroupsTable)
            .where(and(eq(favoriteGroupsTable.userId, id), eq(favoriteGroupsTable.groupId, groupId)))
            .limit(1);

        if (existing) {
            await db
                .delete(favoriteGroupsTable)
                .where(and(eq(favoriteGroupsTable.userId, id), eq(favoriteGroupsTable.groupId, groupId)));
            return res.status(200).json({ success: true, message: 'Group removed from favorites', favorited: false });
        }

        await db.insert(favoriteGroupsTable).values({ userId: id, groupId });
        return res.status(200).json({ success: true, message: 'Group added to favorites', favorited: true });
    } catch (error) {
        console.log('Error toggling favorite group:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const listFavoriteGroups: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;

        const groups = await db
            .select({
                groupId: groupsTable.id,
                groupName: groupsTable.groupName,
                description: groupsTable.description,
                groupImage: groupsTable.groupImage,
                favoritedAt: favoriteGroupsTable.createdAt,
            })
            .from(favoriteGroupsTable)
            .leftJoin(groupsTable, eq(favoriteGroupsTable.groupId, groupsTable.id))
            .where(eq(favoriteGroupsTable.userId, id))
            .orderBy(desc(favoriteGroupsTable.createdAt));

        return res.status(200).json({ success: true, message: 'Favorite groups fetched', groups });
    } catch (error) {
        console.log('Error fetching favorite groups:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
