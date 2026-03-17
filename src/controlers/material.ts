import { Request, Response } from "express";
import { db } from "../lib/db";
import { materialsTable } from "../schema";
import { and, asc, eq, sql } from "drizzle-orm";

export const listMaterials: any = async (req: Request, res: Response) => {
    try {
        const { category } = req.query;

        const materials = await db
            .select()
            .from(materialsTable)
            .where(
                category
                    ? and(eq(materialsTable.isActive, true), eq(materialsTable.category, String(category)))
                    : eq(materialsTable.isActive, true)
            )
            .orderBy(asc(materialsTable.sortOrder), asc(materialsTable.title));

        return res.status(200).json({ success: true, message: 'Materials fetched', materials });
    } catch (error) {
        console.log('Error fetching materials:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getRandomMaterial: any = async (req: Request, res: Response) => {
    try {
        const [material] = await db
            .select()
            .from(materialsTable)
            .where(eq(materialsTable.isActive, true))
            .orderBy(sql`RANDOM()`)
            .limit(1);

        if (!material) return res.status(404).json({ success: false, message: 'No materials found' });
        return res.status(200).json({ success: true, message: 'Random material fetched', material });
    } catch (error) {
        console.log('Error fetching random material:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
