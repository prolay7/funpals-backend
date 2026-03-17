import { sql } from "drizzle-orm";
import { Request,Response } from "express"
import { db } from "../lib/db";
export const searchLiveMeets:any = async(req:Request,res:Response)=>{
    try {
        const {searchQuery} = req.query;
        const meetings = await db.execute(sql`
            SELECT 
                meetings.id,
                meetings.meet_title as "meetTitle",
                meetings.meet_description as "meetDescription",
                meetings.number_of_users as "numberOfUsers",
                meetings.is_active as "isActive",
                categories.name AS "categoryName"
            FROM meetings
            JOIN categories 
                ON meetings.meet_category = categories.id
            WHERE 
                meetings.is_active = true
                AND meetings.is_private = false
                AND (
                (meet_title || ' ' || meet_description) ILIKE ${'%' + searchQuery + '%'}
                OR similarity(meet_title || ' ' || meet_description, ${searchQuery}) > 0.3
                )
            ORDER BY 
                similarity(meet_title || ' ' || meet_description, ${searchQuery}) DESC
            `);
        return res.status(200).json({
            success:true,
            message:`results for querry ${searchQuery}`,
            meetings:meetings.rows
        })   
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}


export const searchCategories:any = async(req:Request,res:Response)=>{
    try {
        const {searchQuery} = req.query;
        const categories = await db.execute(sql`
            SELECT id,name,is_special as "isSpecial"
            FROM categories
            WHERE depth = 1
              AND (
                (name || ' ' || details) ILIKE ${'%' + searchQuery + '%'}
                OR similarity(name || ' ' || details, ${searchQuery}) > 0.3
              )
            ORDER BY similarity(name || ' ' || details, ${searchQuery}) DESC
          `);
          return res.status(200).json({
            success:true,
            message:`results for querry ${searchQuery}`,
            categories:categories.rows
        }) 
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}


export const searchUsers:any = async(req:Request,res:Response)=>{
    try {
        const {searchQuery} = req.query;
        const users = await db.execute(sql`
            SELECT id,name,profile_photo as profilephoto,status FROM users
            WHERE name ILIKE '%' || ${searchQuery} || '%'
             OR similarity(name, ${searchQuery}) > 0.3
             ORDER BY similarity(name, ${searchQuery}) DESC
            `);
        return res.status(200).json({
            success:true,
            message:`results for querry ${searchQuery}`,
            users:users.rows
        }) 
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}
