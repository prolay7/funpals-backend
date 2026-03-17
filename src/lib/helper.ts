import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { client } from './google';
import { google } from 'googleapis';
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../lib/db";
import { meetingTable, privateMeetingTable, usersTable, verificationsTable } from "../schema";
import { SocketManager } from "../socket/socket";
import { SocketEvents } from "../socket/eventnames";
import { IMeetLinkAndNotifyPayload } from "../types";
import { StreamChannel } from '../stream/stream.channel';
import { StreamUtilities } from '../stream/stream.utils';
import { AppCallType } from '../enums/stream';
import RedisClient from '../redis';
import { getUserKey, VERIFICATION_REQUEST_KEY } from '../redis/keys';

type PayLoad = {
  id: number;
  email: string;
};

export const createJwt = (payload: PayLoad) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' });
  return token;
};

export const verifyJwt = (token: string) => {
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as PayLoad;
  return payload;
};


export const getTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers?.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1]; 
};

export const createGoogleMeetlink = async (refreshToken: string) => {
  try {
    client.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: client });

    const event = {
      summary: 'Open Google Meet Meeting',
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      conferenceData: {
        createRequest: {
          requestId: Math.random().toString(36).substring(2),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      },
      // These fields make the meeting as open as possible
      anyoneCanAddSelf: true,      // Allow anyone with the link to add themselves
      guestsCanInviteOthers: true, // Allow guests to invite others
      guestsCanModify: false,
      guestsCanSeeOtherGuests: true,
      visibility: 'public',        // Make event visible (for Workspace accounts)
      // Optionally, you can add a description with instructions
      description: 'Anyone with this link can join the meeting. Non-Google users may need to ask to join.'
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: event
    });

    // Return the Meet link
    return response.data.hangoutLink;
  } catch (error) {
    throw new Error('Failed to create meeting: ' + (error as Error).message);
  }
};

export const createCallAndSendDetailsToUser = async(data:IMeetLinkAndNotifyPayload,googlerefreshtoken?:string)=>{
  if(StreamUtilities.isStreamCallAvailaible() || !googlerefreshtoken){
    createStreamCallAndSendToSocket(data);
  }else{
    if(!googlerefreshtoken) return;
    createGmeetLinkAndSendToSocket({...data,googlerefreshtoken});
  }
}
export const createGmeetLinkAndSendToSocket = async({creatorId,targetId,meetTitle,meetDesc,meetCategory,isSpecialCategory,isCussWordOn,googlerefreshtoken}:IMeetLinkAndNotifyPayload & {googlerefreshtoken:string})=>{
    try {
      const meetLink = await createGoogleMeetlink(googlerefreshtoken);
        if(!meetLink) return;
        const [newMeet] = await db.insert(meetingTable).values({
            createdBy:creatorId,
            meetLink,
            numberOfUsers:2,
            isActive:true,
            meetDescription:meetDesc,
            meetTitle,
            meetCategory,
            isCussWordOn,
            isSpecialCategory,
        }).returning();
        await db.update(usersTable).set({
            lastJoinedMeet:newMeet.id,
        }).where(inArray(usersTable.id,[creatorId,targetId]));

        SocketManager.sendEventToUser(targetId,SocketEvents.MEET_LINK_OR_TOKEN,{case:4,callType:AppCallType.GMEET,meetLink});
        SocketManager.sendEventToUser(creatorId,SocketEvents.MEET_LINK_OR_TOKEN,{case:4,callType:AppCallType.GMEET,meetLink});
    } catch (error) {
       console.error('Error while creating meet link',error);
    }
}

export const  isVerificationExists = async (userId1: number, userId2: number) => {
  try {
     const exists = await db.select().from(verificationsTable).where(
      and(
        or(
        and(eq(verificationsTable.forUser,userId1),eq(verificationsTable.byUser,userId2)),
        and(eq(verificationsTable.forUser,userId2),eq(verificationsTable.byUser,userId1))
      ),
      eq(verificationsTable.verified,true)
      )
     ).limit(1);
     if(!exists) return false;
     return exists?.length > 0;
  } catch (error) {
    console.log('Error while checking verification',error);
    throw new Error('Something went wrong 52')
  }
}


export const createStreamCallAndSendToSocket = async({creatorId,targetId,meetTitle,meetDesc,meetCategory,isSpecialCategory,isCussWordOn}:IMeetLinkAndNotifyPayload)=>{
  try {
    const callId = await StreamChannel.createNewCall({creatorId:creatorId,friendId:targetId});
    if(!callId) throw new Error('No call id found');
    await db.insert(meetingTable).values({
            createdBy:creatorId,
            streamCallId:callId,
            numberOfUsers:0,
            meetDescription:meetDesc,
            meetTitle,
            meetCategory,
            isCussWordOn,
            isSpecialCategory        
        });
    const senderObject = StreamUtilities.buildObjectForUser({userId:creatorId,callId,isGroupCall:false});
    const receiverObject = StreamUtilities.buildObjectForUser({userId:targetId,callId,isGroupCall:false});
    SocketManager.sendEventToUser(targetId,SocketEvents.MEET_LINK_OR_TOKEN,{case:4,callType:AppCallType.VIDEO,callEntryDetails:receiverObject});
    SocketManager.sendEventToUser(creatorId,SocketEvents.MEET_LINK_OR_TOKEN,{case:4,callType:AppCallType.VIDEO,callEntryDetails:senderObject});
  } catch (error) {
     console.log('Error while creating stream call',error);
  }
}


export const sendVerificationCaseResponse = async({
  creatorId,
  targetId,
  numberOfVerifiedUsers,
  meetTitle,
  meetDesc,
  meetCategory,
  isSpecialCategory,
  isCussWordOn,
  caseForTarget,
  caseForCreator
}:{
  creatorId:number,
  targetId:number,
  numberOfVerifiedUsers:number,
  meetTitle:string,
  meetDesc:string,
  meetCategory:number,
  isSpecialCategory:boolean,
  isCussWordOn:boolean,
  caseForTarget:number,
  caseForCreator:number
})=>{
  try {
await Promise.all([
    await RedisClient.getInstance().hset(getUserKey(creatorId),VERIFICATION_REQUEST_KEY,JSON.stringify({
      meetCreatorId:creatorId,
      numberOfVerifiedUsers,
      meetTitle,
      meetDesc,
      meetCategory,
      isSpecialCategory,
      isCussWordOn
    })),
    await RedisClient.getInstance().hset(getUserKey(targetId),VERIFICATION_REQUEST_KEY,JSON.stringify({
      meetCreatorId:creatorId,
      numberOfVerifiedUsers,
      meetTitle,
      meetDesc,
      meetCategory,
      isSpecialCategory,
      isCussWordOn
    }))
    ]);
    SocketManager.sendEventToUser(targetId,SocketEvents.MEET_LINK_OR_TOKEN,{case:caseForTarget,friendId:creatorId});
    SocketManager.sendEventToUser(creatorId,SocketEvents.MEET_LINK_OR_TOKEN,{case:caseForCreator,friendId:targetId});
  } catch (error) {
    console.log('Error while sending verification case response',error);
  }
}



export const createPrivateCallAndSendToSocket = async({creatorId,targetId}:{
  creatorId:number,
  targetId:number
})=>{
  try {
    const callId = await StreamChannel.createNewCall({creatorId:creatorId,friendId:targetId});
    if(!callId) throw new Error('No call id found');
    await db.insert(privateMeetingTable).values({
      createdBy:creatorId,
      streamCallId:callId,
      invitedUserId:targetId
    })
    const senderObject = StreamUtilities.buildObjectForUser({userId:creatorId,callId,isGroupCall:false});
    const receiverObject = StreamUtilities.buildObjectForUser({userId:targetId,callId,isGroupCall:false});
    SocketManager.sendEventToUser(targetId,SocketEvents.MEET_LINK_OR_TOKEN,{case:4,callType:AppCallType.VIDEO,callEntryDetails:receiverObject});
    SocketManager.sendEventToUser(creatorId,SocketEvents.MEET_LINK_OR_TOKEN,{case:4,callType:AppCallType.VIDEO,callEntryDetails:senderObject});
  } catch (error) {
     console.log('Error while creating stream call',error);
  }
}
