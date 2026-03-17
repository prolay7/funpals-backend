import { Request, Response } from "express";
import { db } from "../lib/db";
import { openPostsTable, usersTable } from "../schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";

function parseTags(tags: string | null | string[]): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    // PostgreSQL text array format: {"react","wealth"}
    if (tags.startsWith('{') && tags.endsWith('}')) {
        return tags.slice(1, -1).split(',').map(t => t.replace(/^"|"$/g, '').trim()).filter(Boolean);
    }
    // JSON string format: ["react","wealth"]
    try { return JSON.parse(tags); } catch { return tags ? [tags] : []; }
}

export const listPosts: any = async (req: Request, res: Response) => {
    try {
        const cursor = req.query.cursor ? Number(req.query.cursor) : null;
        const limit = 20;

        const rows = await db
            .select({
                id: openPostsTable.id,
                title: openPostsTable.title,
                content: openPostsTable.content,
                tags: openPostsTable.tags,
                createdAt: openPostsTable.createdAt,
                authorId: openPostsTable.userId,
                authorName: usersTable.name,
                authorPhoto: usersTable.profilephoto,
            })
            .from(openPostsTable)
            .leftJoin(usersTable, eq(openPostsTable.userId, usersTable.id))
            .where(
                cursor
                    ? and(isNull(openPostsTable.deletedAt), lt(openPostsTable.id, cursor))
                    : isNull(openPostsTable.deletedAt)
            )
            .orderBy(desc(openPostsTable.createdAt))
            .limit(limit + 1);

        const hasMore = rows.length > limit;
        if (hasMore) rows.pop();
        const nextCursor = hasMore && rows.length > 0 ? rows[rows.length - 1].id : null;

        const posts = rows.map(r => ({
            id: r.id,
            title: r.title,
            content: r.content,
            tags: parseTags(r.tags),
            createdAt: r.createdAt,
            author: { id: r.authorId, name: r.authorName ?? 'Unknown', profileImage: r.authorPhoto ?? null },
            likeCount: 0,
            commentCount: 0,
        }));

        console.log('[listPosts] Returned', posts.length, 'posts');
        return res.status(200).json({ success: true, message: 'Posts fetched', posts, hasMore, nextCursor });
    } catch (error) {
        console.log('Error fetching posts:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createPost: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const { title, content, tags } = req.body;

        if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content are required' });
        if (title.length > 120) return res.status(400).json({ success: false, message: 'Title must be 120 characters or less' });
        if (content.length > 2000) return res.status(400).json({ success: false, message: 'Content must be 2000 characters or less' });

        const [post] = await db
            .insert(openPostsTable)
            .values({ userId: id, title, content, tags: Array.isArray(tags) && tags.length ? JSON.stringify(tags) : null })
            .returning();

        return res.status(201).json({ success: true, message: 'Post created', post });
    } catch (error) {
        console.log('Error creating post:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
