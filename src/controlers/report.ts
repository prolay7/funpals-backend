import {Request,Response} from 'express';
import { db } from '../lib/db';
import { reportTable } from '../schema/report';

export const reportUser:any = async (req:Request,res:Response) => {
    try {
        const {reportedUserId,reason} = req.body;
        const {id} = req.body.user;
        if(!reportedUserId || !reason) return res.status(400).json({
            success:false,
            message:'reportedUserId and reason is required'
        })
        await db.insert(reportTable).values({
            reporterId:id,
            reportedToId:reportedUserId,
            reason
        })
        return res.status(200).json({
            success:true,
            message:'reported successfully'
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}