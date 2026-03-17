import e, { Request, Response } from "express";
import { db } from "../lib/db";
import { mediaTable } from "../schema";
import { eq } from "drizzle-orm";

export const addMedia:any = async(req:Request,res:Response)=>{

    try {
        const { type, mediaUrl, categoryId,title, description } = req.body;
        const newMedia = await db.insert(mediaTable).values({
            type:Number(type),
            url: mediaUrl,
            categoryId:Number(categoryId),
            title,
            description
        }).returning();
        return res.status(201).json({
            success: true,
            media: newMedia[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const getMediaOnCategory: any = async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    try {
        const medias = await db.select().from(mediaTable).where(eq(mediaTable.categoryId, Number(categoryId)));
        return res.status(200).json({
            success: true,
            medias
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};