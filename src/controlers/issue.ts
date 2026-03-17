import { Request, Response } from "express";
import { issueTable } from "../schema/issue";
import { db } from "../lib/db";
import { and, eq, not } from "drizzle-orm";
import { ISSUE_STATUS, userStatus } from "../lib/constants";
import { categoriesTable, usersTable } from "../schema";
import RedisClient from "../redis";
import { getUserKey } from "../redis/keys";

export const createIssue: any = async(req:Request, res:Response) => {
    const { title, description,category,isPublic } = req.body;

    if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required." });
    }
    const userId = req.body.user.id;

    try {
        const newIssue = await db.insert(issueTable).values({
            title,
            description,
            userId,
            category,
            isPublic
        });
        return res.status(201).json(newIssue);
    } catch (error) {
        console.error("Error creating issue:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


export const toggleVisibility: any = async(req: Request, res: Response) => {
    const {isPublic} = req.body;
    const issueId = req.params.id;
    try {
    
        const [updatedIssue] = await db.update(issueTable).set({ 
            isPublic:Boolean(isPublic)
        }).where(eq(issueTable.id, Number(issueId))).returning();

        return res.status(200).json(updatedIssue);
    } catch (error) {
        console.error("Error toggling issue visibility:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


export const deleteIssue: any = async(req: Request, res: Response) => {
    const issueId = req.params.id;
    try {
        const [deletedIssue] = await db.delete(issueTable).where(eq(issueTable.id, Number(issueId))).returning();
        if (!deletedIssue) {
            return res.status(404).json({ message: "Issue not found." });
        }
        return res.status(200).json(deletedIssue);
    } catch (error) {
        console.error("Error deleting issue:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


export const updateIssue: any = async(req: Request, res: Response) => {
    const issueId = req.params.id;
    const { title, description, category,isPublic } = req.body;

    try {
        const [updatedIssue] = await db.update(issueTable).set({
            title,
            description,
            category,
            isPublic
        }).where(eq(issueTable.id, Number(issueId))).returning();

        if (!updatedIssue) {
            return res.status(404).json({ message: "Issue not found." });
        }
        return res.status(200).json(updatedIssue);
    } catch (error) {
        console.error("Error updating issue:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}




export const changeStatusOfIssue:any = async(req:Request,res:Response)=>{
    try {
        const issueId = req.params.id;
        const { status } = req.body;

        const [updatedIssue] = await db.update(issueTable).set({
            status
        }).where(eq(issueTable.id, Number(issueId))).returning();

        if (!updatedIssue) {
            return res.status(404).json({ message: "Issue not found." });
        }
        return res.status(200).json(updatedIssue);
    } catch (error) {
        console.error("Error changing issue status:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


export const getIssuesBelongsToUser: any = async(req: Request, res: Response) => {
    const userId = req.params.id;
    try {
        const [issues] = await db.select().from(issueTable).where(
            and(
                eq(issueTable.userId, Number(userId)),
                eq(issueTable.isPublic, true)
            )
        );
        return res.status(200).json(issues);
    } catch (error) {
        console.error("Error fetching issues:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


export const getUserOwnIssues: any = async(req: Request, res: Response) => {
    const userId = req.body.user.id;
    try {
        const issues = await db.select({
            id:issueTable.id,
            title:issueTable.title,
            userId:issueTable.userId,
            description:issueTable.description,
            createdAt:issueTable.createdAt,
            updatedAt:issueTable.updatedAt,
            isPublic:issueTable.isPublic,
            status:issueTable.status,
            category:{
                id:categoriesTable.id,
                name:categoriesTable.name
            }
        }).from(issueTable).innerJoin(categoriesTable, eq(issueTable.category, categoriesTable.id)).where(eq(issueTable.userId, Number(userId)));
        return res.status(200).json(issues);
    } catch (error) {
        console.error("Error fetching issues:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


export const getIssuesBelongsToCategory:any = async(req: Request, res: Response) => {
    const categoryId = req.params.id;
    const userId = req.body.user.id;
    try {
        const {page,limit} = req.query;
        const safePage = Number(page) || 1;
        const safeLimit = Number(limit) || 10;

        const issues = await db.select({
            id: issueTable.id,
            title: issueTable.title,
            description: issueTable.description,
            category: issueTable.category,
            createdAt: issueTable.createdAt,
            updatedAt: issueTable.updatedAt,
            status: issueTable.status,
            user:{
                name:usersTable.name,
                id:usersTable.id,
                profilephoto: usersTable.profilephoto
            }
        }).from(issueTable).innerJoin(usersTable, eq(issueTable.userId, usersTable.id)).where(
            and(
                eq(issueTable.category, Number(categoryId)),
                eq(issueTable.isPublic, true),
                not(eq(issueTable.userId,userId))
            )
        )
        .limit(safeLimit+1).offset((safePage - 1) * safeLimit);

        const hasMore = issues.length > safeLimit;
        if(hasMore) issues.pop();
        
        const keys = issues.map((issue) => getUserKey(issue.user.id));
        if(keys.length===0) return res.status(200).json({
            success: true,
            issues: [],
            hasMore: false,
            nextPage: safePage + 1
        });
        const statuses = await RedisClient.getInstance()?.multiGet(keys);
        issues.forEach((issue, index) => {
            (issue.user as any).status = statuses?.[index] || userStatus.OFFLINE;
        });
        return res.status(200).json({
            success: true,
            issues,
            hasMore,
            nextPage: safePage + 1
        });
    } catch (error) {
        console.error("Error fetching issues:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


export const getAllIssues:any = async(req: Request, res: Response) => {
    try {
        const {page,limit} = req.query;
        const safePage = Number(page) || 1;
        const safeLimit = Number(limit) || 10;
        const userId = req.body.user.id;

        const issues = await db.select({
                id: issueTable.id,
                title: issueTable.title,
                description: issueTable.description,
                status: issueTable.status,
                createdAt: issueTable.createdAt,
                updatedAt: issueTable.updatedAt,
                category:issueTable.category,
                user:{
                    id: usersTable.id,
                    name: usersTable.name,
                    profilephoto: usersTable.profilephoto,
                }
            }).from(issueTable).innerJoin(usersTable,eq(usersTable.id,issueTable.userId)).where(
            and(
                not(eq(issueTable.userId,userId)),
                eq(issueTable.isPublic,true),
            )
        )
        .limit(safeLimit+1).offset((safePage - 1) * safeLimit);

        const hasMore = issues.length > safeLimit;
        if(hasMore) issues.pop();
        
        const keys = issues.map((issue) => getUserKey(issue.user.id));
        if(keys.length===0) return res.status(200).json([]);
        const statuses = await RedisClient.getInstance()?.multiGet(keys);
        issues.forEach((issue, index) => {
            (issue.user as any).status = statuses?.[index] || userStatus.OFFLINE;
        });
        return res.status(200).json({
            success: true,
            issues,
            hasMore,
            nextPage:safePage + 1
        });

    } catch (error) {
        console.error("Error fetching issues:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};