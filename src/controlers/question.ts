import { Request, Response } from "express";
import { db } from "../lib/db";
import { openQuestionsTable, usersTable } from "../schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";

function parseTags(tags: string | null | string[]): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (tags.startsWith('{') && tags.endsWith('}')) {
        return tags.slice(1, -1).split(',').map(t => t.replace(/^"|"$/g, '').trim()).filter(Boolean);
    }
    try { return JSON.parse(tags); } catch { return tags ? [tags] : []; }
}

export const listQuestions: any = async (req: Request, res: Response) => {
    try {
        const cursor = req.query.cursor ? Number(req.query.cursor) : null;
        const limit = 20;

        const rows = await db
            .select({
                id: openQuestionsTable.id,
                question: openQuestionsTable.question,
                tags: openQuestionsTable.tags,
                createdAt: openQuestionsTable.createdAt,
                authorId: openQuestionsTable.userId,
                authorName: usersTable.name,
                authorPhoto: usersTable.profilephoto,
            })
            .from(openQuestionsTable)
            .leftJoin(usersTable, eq(openQuestionsTable.userId, usersTable.id))
            .where(
                cursor
                    ? and(isNull(openQuestionsTable.deletedAt), lt(openQuestionsTable.id, cursor))
                    : isNull(openQuestionsTable.deletedAt)
            )
            .orderBy(desc(openQuestionsTable.createdAt))
            .limit(limit + 1);

        const hasMore = rows.length > limit;
        if (hasMore) rows.pop();
        const nextCursor = hasMore && rows.length > 0 ? rows[rows.length - 1].id : null;

        const questions = rows.map(r => ({
            id: r.id,
            question: r.question,
            tags: parseTags(r.tags),
            createdAt: r.createdAt,
            author: { id: r.authorId, name: r.authorName ?? 'Unknown', profileImage: r.authorPhoto ?? null },
            answerCount: 0,
        }));

        console.log('[listQuestions] Returned', questions.length, 'questions');
        return res.status(200).json({ success: true, message: 'Questions fetched', questions, hasMore, nextCursor });
    } catch (error) {
        console.log('Error fetching questions:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createQuestion: any = async (req: Request, res: Response) => {
    try {
        const { id } = req.body.user;
        const { question, tags } = req.body;

        if (!question) return res.status(400).json({ success: false, message: 'Question is required' });
        if (question.length > 500) return res.status(400).json({ success: false, message: 'Question must be 500 characters or less' });

        const [newQuestion] = await db
            .insert(openQuestionsTable)
            .values({ userId: id, question, tags: Array.isArray(tags) && tags.length ? JSON.stringify(tags) : null })
            .returning();

        return res.status(201).json({ success: true, message: 'Question created', question: newQuestion });
    } catch (error) {
        console.log('Error creating question:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
