import { Request, Response } from "express";
import { db } from "../lib/db";
import { sharesTable, usersTable } from "../schema";
import { and, desc, eq, lt } from "drizzle-orm";
import { SocketManager } from "../socket/socket";
import { SocketEvents } from "../socket/eventnames";

export const shareInternal: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const { groupId, content, category } = req.body;

        if (!groupId || !content) return res.status(400).json({ success: false, message: 'groupId and content are required' });
        if (content.length > 2000) return res.status(400).json({ success: false, message: 'Content must be 2000 characters or less' });

        const [share] = await db
            .insert(sharesTable)
            .values({ userId: id, content, category: category ?? null, shareType: 'internal', groupId })
            .returning();

        SocketManager.sendEventToGroup(groupId, SocketEvents.GROUP_MESSAGE_RECEIVED, {
            type: 'share',
            shareId: share.id,
            content,
            userId: id,
        });

        return res.status(201).json({ success: true, message: 'Content shared to group', share });
    } catch (error) {
        console.log('Error sharing internally:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getGlobalFeed: any = async (req: Request, res: Response) => {
    try {
        const { category } = req.query;
        const cursor = req.query.cursor ? Number(req.query.cursor) : null;
        const limit = 20;

        const feed = await db
            .select({
                id: sharesTable.id,
                content: sharesTable.content,
                category: sharesTable.category,
                createdAt: sharesTable.createdAt,
                userId: sharesTable.userId,
                userName: usersTable.name,
                userPhoto: usersTable.profilephoto,
            })
            .from(sharesTable)
            .leftJoin(usersTable, eq(sharesTable.userId, usersTable.id))
            .where(
                and(
                    eq(sharesTable.shareType, 'global'),
                    category ? eq(sharesTable.category, String(category)) : undefined,
                    cursor ? lt(sharesTable.id, cursor) : undefined
                )
            )
            .orderBy(desc(sharesTable.createdAt))
            .limit(limit + 1);

        const hasMore = feed.length > limit;
        if (hasMore) feed.pop();
        const nextCursor = hasMore && feed.length > 0 ? feed[feed.length - 1].id : null;

        return res.status(200).json({ success: true, message: 'Global feed fetched', feed, hasMore, nextCursor });
    } catch (error) {
        console.log('Error fetching global feed:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const shareGlobal: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const { content, category } = req.body;

        if (!content) return res.status(400).json({ success: false, message: 'Content is required' });
        if (content.length > 2000) return res.status(400).json({ success: false, message: 'Content must be 2000 characters or less' });

        const [share] = await db
            .insert(sharesTable)
            .values({ userId: id, content, category: category ?? null, shareType: 'global' })
            .returning();

        return res.status(201).json({ success: true, message: 'Content shared to global feed', share });
    } catch (error) {
        console.log('Error sharing to global feed:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// Records an external share intent (fb/ig/tw/li). Mobile uses the returned
// record as confirmation and opens the native share sheet independently.
export const shareExternal: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const { content, category, platform } = req.body;

        if (!content) return res.status(400).json({ success: false, message: 'Content is required' });
        if (content.length > 2000) return res.status(400).json({ success: false, message: 'Content must be 2000 characters or less' });

        const validPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin'];
        if (platform && !validPlatforms.includes(platform)) {
            return res.status(400).json({ success: false, message: `platform must be one of: ${validPlatforms.join(', ')}` });
        }

        const [share] = await db
            .insert(sharesTable)
            .values({ userId: id, content, category: category ?? null, shareType: 'external' })
            .returning();

        return res.status(201).json({ success: true, message: 'External share logged', share, platform: platform ?? null });
    } catch (error) {
        console.log('Error logging external share:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
