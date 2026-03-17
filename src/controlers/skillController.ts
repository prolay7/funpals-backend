import { Request, Response } from 'express';
import { SkillsTable } from '../schema/skills';
import { db } from '../lib/db';
import { and, eq } from 'drizzle-orm';


export const addUserSkill:any = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.body.user;
    const { title, description, status } = req.body;
    if (!title || description==null || status==null) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const skill = await db.insert(SkillsTable).values({
      userId,
      title,
      description,
      status
    }).returning();
    res.status(201).json({ message: 'Skill added successfully', skill });
  } catch (error) {
    res.status(500).json({ message: 'Error adding user skill', error });
  }
};


export const updateUserSkill:any = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.body.user;
    const { title, description, status } = req.body;
    const skillId = Number(req.params.skillId);
    if (!title || description==null || status==null) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const skill = await db.update(SkillsTable).set({
      title,
      description,
      status
    }).where(and(
        eq(SkillsTable.id, skillId),
        eq(SkillsTable.userId, userId)
    )).returning();
    res.status(200).json({ message: 'Skill updated successfully', skill });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user skill', error });
  }
};  


export const deleteUserSkill:any = async (req: Request, res: Response) => {
    try {
        const { id: userId } = req.body.user;
        const skillId = Number(req.params.skillId);
        await db.delete(SkillsTable).where(and(
            eq(SkillsTable.id, skillId),
            eq(SkillsTable.userId, userId)
        ))
        res.status(200).json({ message: 'Skill deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user skill', error });
    }
};


export const getAllSkillsOfUser = async (userId: number) => {
    try {
        const skills = await db.select().from(SkillsTable).where(eq(SkillsTable.userId, userId));
        return skills;
    } catch (error) {
        throw new Error('Error retrieving user skills');
    }
};


export const getSkillsOfUser = async (req: Request, res: Response) => {
    try {
        const { id: userId } = req.body.user;
        const skills = await getAllSkillsOfUser(userId);
        res.status(200).json({ skills });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving user skills', error });
    }
};