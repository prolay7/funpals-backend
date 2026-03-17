import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { meetingTable, usersTable, verificationsTable } from "../schema";
import { SocketEvents } from "../socket/eventnames";
import { SocketManager } from "../socket/socket";
import { createCallAndSendDetailsToUser, createGoogleMeetlink } from "../lib/helper";
import { Request,Response } from "express";
import { CloudinaryService } from "../lib/cloudinary";
import { userStatus } from "../lib/constants";
import { MultipleUserStatusUpdate } from "./user";
import RedisClient from "../redis";
import { getUserKey, VERIFICATION_REQUEST_KEY } from "../redis/keys";

export const verificationReport:any = async(req:Request,res:Response)=>{
   try {
    const {forUserId,verified,remark,public_id1,public_id2,ageRange,gender} = req.body;
    const {id} = req.body?.user;
    if(!id || !forUserId || !remark || !public_id1 || !public_id2){
       return res.status(404).json({
        success:false,
        message:'Required fields are missing'
       })
    }
     await Promise.all([
       db.insert(verificationsTable).values({
        forUser:forUserId,
        byUser:id,
        verified,
        remark:remark,
        ageRange,
        gender
       }),
        db.update(usersTable).set({
        numberOfUsersMarkedasVerified: sql`${usersTable.numberOfUsersMarkedasVerified} + 1`
        }).where(eq(usersTable.id,forUserId)),
        CloudinaryService.getInstance()?.deleteFile(public_id1),
        CloudinaryService.getInstance()?.deleteFile(public_id2)
     ]);
     SocketManager.sendEventToUser(forUserId,SocketEvents.VERIFICATION_REPORT,{verified})
     if(verified){
        const verificationDetails = await RedisClient.getInstance()?.hgetWithJson(getUserKey(id),VERIFICATION_REQUEST_KEY);
        const {
      numberOfVerifiedUsers,
      meetCreatorId,
      meetTitle,
      meetDesc,
      meetCategory,
      isSpecialCategory,
      isCussWordOn
    } = verificationDetails;
        if(numberOfVerifiedUsers+1===2){
             await createCallAndSendDetailsToUser({
                creatorId:meetCreatorId,
                targetId:(id===meetCreatorId)?forUserId:id,
                meetTitle,
                meetDesc,
                meetCategory,
                isSpecialCategory,
                isCussWordOn
             });
            RedisClient.getInstance()?.hdel(getUserKey(id),VERIFICATION_REQUEST_KEY);
            RedisClient.getInstance()?.hdel(getUserKey(forUserId),VERIFICATION_REQUEST_KEY);
        }else{
            await RedisClient.getInstance()?.hset(getUserKey(id),VERIFICATION_REQUEST_KEY,JSON.stringify({
                ...verificationDetails,
                numberOfVerifiedUsers:numberOfVerifiedUsers+1
            }));
            await RedisClient.getInstance()?.hset(getUserKey(forUserId),VERIFICATION_REQUEST_KEY,JSON.stringify({
                ...verificationDetails,
                numberOfVerifiedUsers:numberOfVerifiedUsers+1
            }));
        }
     }else{
       await MultipleUserStatusUpdate([id,forUserId],userStatus.ONLINE);
     }
     return res.status(200).json({
      success:true,
      message:'Verification updated',
      verified
     })
   } catch (error) {
     return res.status(500).json({
      success:false,
      message:'Internal server errot'
     })
   }
}


export const shareImages:any= async(req:Request,res:Response)=>{
  try {
    const {friendId,ageRange,gender} = req.body;
    const [file1, file2] = (req.files as Express.Multer.File[]) || [];
    const [upload1,upload2] =  await Promise.all([
       CloudinaryService.getInstance()?.uploadBuffer(file1.buffer),
       CloudinaryService.getInstance()?.uploadBuffer(file2.buffer)
    ])
    SocketManager.sendEventToUser(friendId,SocketEvents.IMAGE_RECEIVED_FROM_FRIEND,{
       images:[upload1,upload2],
       ageRange,
       gender
    })
    return res.status(200).json({
      success:true,
      message:'Images were shared with your friend'
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success:false,
      message:'Internal server error'
    })
  }
}