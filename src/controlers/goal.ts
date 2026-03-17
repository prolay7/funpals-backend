import { Request, Response } from "express";
import { db } from "../lib/db";
import { goalsTable } from "../schema";
import { desc, eq } from "drizzle-orm";
import RedisClient from "../redis";
import { getGoalTodayShownKey } from "../redis/keys";

export const createGoal:any = async(req:Request,res:Response)=>{
    try {
        const userId = Number(req.body.user.id);
        const {goal} = req.body;
        const newGoal = await db.insert(goalsTable).values({
            userId,
            goal,
            isCompleted:false
        }).returning();
        return res.status(201).json({
            success: true,
            goal: newGoal[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const deleteGoal:any = async(req:Request,res:Response)=>{

    try {
        const goalId = Number(req.params.id);
        const deletedGoal = await db.delete(goalsTable).where(eq(goalsTable.id, goalId)).returning();
        if (!deletedGoal) {
            return res.status(404).json({ success: false, message: "Goal not found" });
        }
        return res.status(200).json({ success: true, goal: deletedGoal[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const getUserGoals:any = async(req:Request,res:Response)=>{

    try {
        const userId = Number(req.body.user.id);
        const userGoals = await db.select().from(goalsTable).where(eq(goalsTable.userId, userId)).orderBy(desc(goalsTable.createdAt));
        return res.status(200).json({ success: true, goals: userGoals });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


export const updateGoalStatus:any = async(req:Request,res:Response)=>{

    try {
        const goalId = Number(req.params.id);
        const { isCompleted } = req.body;
        const updatedGoal = await db.update(goalsTable).set({ isCompleted, completedOn: isCompleted ? new Date(Date.now()) : null }).where(eq(goalsTable.id, goalId)).returning();
        if (!updatedGoal) {
            return res.status(404).json({ success: false, message: "Goal not found" });
        }
        return res.status(200).json({ success: true, goal: updatedGoal[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

// Returns the user's most recent non-completed goal for display at login.
// Uses Redis with a TTL until midnight to enforce the "show once per day" rule.
export const getGoalToday: any = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.body.user.id);
        const shownKey = getGoalTodayShownKey(userId);

        const alreadyShown = await RedisClient.getInstance()?.get(shownKey);
        if (alreadyShown) {
            return res.status(200).json({ success: true, goal: null, alreadyShown: true });
        }

        const [goal] = await db
            .select()
            .from(goalsTable)
            .where(eq(goalsTable.userId, userId))
            .orderBy(desc(goalsTable.createdAt))
            .limit(1);

        if (!goal) {
            return res.status(200).json({ success: true, goal: null, alreadyShown: false });
        }

        // TTL = seconds remaining until midnight local server time
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);
        await RedisClient.getInstance()?.set(shownKey, '1', ttl);

        return res.status(200).json({ success: true, goal, alreadyShown: false });
    } catch (error) {
        console.error('Error fetching today goal:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}