import { Request, Response } from "express";
import { db } from "../lib/db";
import { categoriesTable, meetingTable, usersTable} from "../schema";
import { and, desc, eq, gt, inArray, is, sql } from "drizzle-orm";
import { userStatus } from "../lib/constants";
import { SocketManager } from "../socket/socket";
import { SocketEvents } from "../socket/eventnames";
import { handleUserStatusUpdate, MultipleUserStatusUpdate } from "./user";
import RedisClient from "../redis";
import { getUserKey, MEETING_REQUEST_KEY, VERIFICATION_REQUEST_KEY } from "../redis/keys";
import { createCallAndSendDetailsToUser, createPrivateCallAndSendToSocket, isVerificationExists, sendVerificationCaseResponse } from "../lib/helper";
import { CHAT_IMAGE_NOTIFICATION_TYPE, notificationService } from "../firebase/notification";
import { AppCallType } from "../enums/stream";
import { StreamChannel } from "../stream/stream.channel";
import { StreamUtilities } from "../stream/stream.utils";
import { channel } from "diagnostics_channel";


type MeetRequestParam = {
    creatorUserId:number,
    targetUserId:number,
    meetTitle:string,
    meetDesc:string,
    meetCategory:number,
    isCussWordOn:boolean,
    isSpecialCategory:boolean
}

export const getOngoingMeetLink:any = async(req:Request,res:Response)=>{
    try {
        const {meetid} = req.query;
        const {id} = req.body?.user;
        if(!meetid) return res.status(401).json({
            success:false,
            message:'meetid is required'
        })
        const [meeting] = await db.select().from(meetingTable).where(and(eq(meetingTable.id,Number(meetid)),eq(meetingTable.isActive,true))).limit(1);
        if(!meeting){
            throw new Error('Meeting not found');
        }
        if(!meeting.streamCallId && !meeting.meetLink){
            throw new Error('Meeting link not found');
        } 
        if(meeting?.streamCallId){
            await StreamChannel.addUserToCall({callId:meeting.streamCallId,userId:id,isGroupCall:false});
            await handleUserStatusUpdate(id,userStatus.BUSY);
            const callEntryDetails = StreamUtilities.buildObjectForUser({userId:id,callId:meeting.streamCallId,isGroupCall:false});
            return res.status(200).json({
                success:true,
                message:'meeting details was fetched',
                meetingType:AppCallType.VIDEO,
                callEntryDetails
            })
        }  
        await handleUserStatusUpdate(id,userStatus.BUSY);
        return res.status(200).json({
            success:true,
            message:'meeting details was fetched',
            meetingType:AppCallType.GMEET,
            meetinglink:meeting.meetLink
        })
    } catch (error) {
        console.log("error while joining meeting details:", error)
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}

export const createMeetLinkOrRoomToken = async({creatorUserId,targetUserId,meetTitle,meetDesc,meetCategory,isSpecialCategory,isCussWordOn}:MeetRequestParam)=>{
   try {
    const [user1,user2] = await db.select().
        from(usersTable).where(inArray(usersTable.id,[creatorUserId,targetUserId]));

        const creator = user1.id===creatorUserId?user1:user2;
        const target =  user1.id===targetUserId?user1:user2;
        const googlerefreshtoken = creator?.googlerefreshtoken || target?.googlerefreshtoken;
        if(creator.numberOfUsersMarkedasVerified>=2 && target.numberOfUsersMarkedasVerified>=2){
            await createCallAndSendDetailsToUser({creatorId:creator.id,targetId:target.id,meetTitle,meetDesc,meetCategory,isSpecialCategory,isCussWordOn},googlerefreshtoken!);
            return;
        }else{
            const verificationExists = await isVerificationExists(creator.id,target.id);
            if(verificationExists){
                await createCallAndSendDetailsToUser({creatorId:creator.id,targetId:target.id,meetTitle,meetDesc,meetCategory,isSpecialCategory,isCussWordOn},googlerefreshtoken!);
                return;
            }
        }
        const meet = {
            meetTitle,
            meetDesc,
            meetCategory,
            isSpecialCategory,
            isCussWordOn
        }
        if(creator.numberOfUsersMarkedasVerified<2 && target.numberOfUsersMarkedasVerified<2){
           await sendVerificationCaseResponse({creatorId:creator.id,targetId:target.id,numberOfVerifiedUsers:0,caseForCreator:1,caseForTarget:1,...meet});
           return;
        }

        if(creator.numberOfUsersMarkedasVerified<2){
            await sendVerificationCaseResponse({creatorId:creator.id,targetId:target.id,numberOfVerifiedUsers:1,caseForCreator:2,caseForTarget:3,...meet});
            return;
        }

        if(target.numberOfUsersMarkedasVerified<2){
           await sendVerificationCaseResponse({creatorId:creator.id,targetId:target.id,numberOfVerifiedUsers:1,caseForCreator:3,caseForTarget:2,...meet});
           return;
        } 
   } catch (error) {
       SocketManager.sendEventToUser(creatorUserId,SocketEvents.SOMETHING_WENT_WRONG,null);
       SocketManager.sendEventToUser(targetUserId,SocketEvents.SOMETHING_WENT_WRONG,null)
   }
}


export const inviteForAMeet:any = async(req:Request,res:Response)=>{
    try {
        const {targetUserId,meetTitle,meetDesc,meetCategory,isCussWordOn} = req.body;
        const {id} = req.body?.user;
        const status = await RedisClient.getInstance()?.get(getUserKey(targetUserId));
        if(status!==userStatus.ONLINE){
            return res.status(400).json({
                success:false,
                message:'User is currently unavailaible to take calls'
            })
        }
        await MultipleUserStatusUpdate([id,targetUserId],userStatus.BUSY);
        const [category] = await db.select({
            name:categoriesTable.name,
            isSpecialCategory:categoriesTable.isSpecial
        }).from(categoriesTable).where(eq(categoriesTable.id,meetCategory)).limit(1);
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id,id)).limit(1);
        await RedisClient.getInstance()?.hset(getUserKey(targetUserId),MEETING_REQUEST_KEY,JSON.stringify({
            creatorUserId:user.id,
            meetTitle,
            meetDesc,
            meetCategory,
            meetCategoryName:category.name,
            isSpecialCategory:category.isSpecialCategory,
            isCussWordOn,
            isPrivate:false
        }))
        SocketManager.sendEventToUser(targetUserId,SocketEvents.INCOMING_MEET_REQUEST,{
            creatorUserId:user.id,
            userName:user.name,
            profilePhoto:user.profilephoto,
            meetTitle,
            meetDesc,
            meetCategory,
            meetCategoryName:category.name,
            isSpecialCategory:category.isSpecialCategory,
            isCussWordOn,
            isPrivate:false
        });
        return res.status(200).json({
            success:true,
            message:'Invitation sent to traget user'
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}



export const notifyUser:any = async(req:Request,res:Response)=>{
    try {
        const {targetUserId,meetCategoryId,meetTitle} = req.body;
        if(!targetUserId || !meetCategoryId || !meetTitle) return res.status(400).json({
            success:false,
            message:'Target user id, meet category id and meet title are required'
        })
        const {id} = req.body?.user;
        const canInvite = await RedisClient.getInstance()?.canNotify(id);
        if(!canInvite) return res.status(400).json({
            success:false,
            message:'You have exceeded the notification limit per hour'
        })
        const [category,[user1,user2]] = await Promise.all([
            db.select({name:categoriesTable.name}).from(categoriesTable).where(eq(categoriesTable.id,meetCategoryId)).limit(1),
            db.select({id:usersTable.id,name:usersTable.name,fcmToken:usersTable.fcmToken,profilePhoto:usersTable.profilephoto}).from(usersTable).where(inArray(usersTable.id,[targetUserId,id])).limit(2)
        ]);
        const sender = user1.id===id?user1:user2;
        const receiver = user1.id===id?user2:user1;
        if(receiver.fcmToken){
            const messageBody = {
                title: `${meetTitle}`,
                message: `${sender.name} is trying to invite you to ${category[0].name} meet`,
                image: sender?.profilePhoto!
            }
            await notificationService.sendNotification(
                receiver.fcmToken,
                messageBody,
                CHAT_IMAGE_NOTIFICATION_TYPE,
                undefined, // senderId
                undefined // senderName
            );
        }
        return res.status(200).json({
            success:true,
            message:'Invitation sent to target user'
        })
    } catch (error) {
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        })
    }
}



export const  addUserToCallFromChannelId = async(channelId:string)=>{
  try {
     await db.update(meetingTable).set(
        { numberOfUsers: sql`${meetingTable.numberOfUsers} + 1` }
     ).where(eq(meetingTable.streamCallId,channelId));
  } catch (error) {
     console.log('Error while adding user to call',error);
  }
}

export const  removeUserFromCallFromChannelId = async(channelId:string)=>{
  try {
     await db.update(meetingTable).set(
        { numberOfUsers: sql`${meetingTable.numberOfUsers} - 1` }
     ).where(eq(meetingTable.streamCallId,channelId));
  } catch (error) {
     console.log('Error while removing user from call',error);
  }
}

export const callEnded = async(channelId:string)=>{
  try {
     await db.update(meetingTable).set(
        { isActive: false }
     ).where(eq(meetingTable.streamCallId,channelId));
  } catch (error) {
     console.log('Error while ending call',error);
  }
}

export const callStarted = async(channelId:string)=>{
  try {
     await db.update(meetingTable).set(
        { isActive: true }
     ).where(eq(meetingTable.streamCallId,channelId));
  } catch (error) {
     console.log('Error while starting call',error);
  }
}



export const requestPrivateMeeting:any = async(req:Request,res:Response)=>{
    try {
        const {targetUserId,isCussWordOn,meetingNote} = req.body;
        const userId = req.body?.user?.id;
        const status = await RedisClient.getInstance()?.getStatusOfUser(targetUserId);
        if(status!==userStatus.ONLINE){
            return res.status(400).json({
                success:false,
                message:'User is currently unavailaible to take calls'
            })
        };
        await MultipleUserStatusUpdate([userId,targetUserId],userStatus.BUSY);
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id,userId)).limit(1);
        await RedisClient.getInstance()?.hset(getUserKey(targetUserId),MEETING_REQUEST_KEY,JSON.stringify({
            creatorUserId:user.id,
            isCussWordOn,
            isPrivate:true
        }));
        SocketManager.sendEventToUser(targetUserId,SocketEvents.INCOMING_MEET_REQUEST,{
            creatorUserId:user.id,
            userName:user.name,
            profilePhoto:user.profilephoto,
            isCussWordOn,
            meetingNote,
            isPrivate:true
        });
        return res.status(200).json({
            success:true,
            message:'Private meeting request sent successfully'
        });
    } catch (error) {
        console.log('Error while sending private meeting request',error);
        return res.status(500).json({
            success:false,
            message:'Internal server error'
        });
    }
};


export const getlivemeetings:any = async(req:Request,res:Response)=>{
     try {
    const {page,limit} = req.query;
    const safePage = Number(page) || 1;
    const safeLimit = Number(limit) || 10;
    const offset = (safePage - 1) * safeLimit;
    const userId = req.body.user.id;
    const [user] = await db.select({
      userAllowsCussword: usersTable.isCussWordOn,
      userAllowsSpecial: usersTable.isSpecialCategoryOptIn
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    
    const meetings = await db
      .select().from(meetingTable).where(
        and(
           eq(meetingTable.isActive, true),
           !user?.userAllowsCussword ? eq(meetingTable.isCussWordOn, false) : undefined,
           !user?.userAllowsSpecial ? eq(meetingTable.isSpecialCategory, false) : undefined
        )
      )
      .offset(offset)
      .limit(safeLimit+1);
      const hasMore = meetings.length > safeLimit;
      if (hasMore) meetings.pop();
      return res.status(200).json({
        success: true,
        message: 'Meetings fetched successfully',
        hasMore,
        meetings,
        nextPage: safePage + 1
      });
      
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};



export const handlePrivateMeetingAccepted = async({creatorUserId,targetUserId}:{creatorUserId:number,targetUserId:number})=>{
   try {
       await createPrivateCallAndSendToSocket({creatorId:creatorUserId,targetId:targetUserId});
   } catch (error) {
       console.log('Error while handling private meeting acceptance',error);
   }
};