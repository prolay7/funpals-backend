import { Request, Response } from "express";
import { db } from "../lib/db";
import { groupsTable } from "../schema/group";
import { DEFAULT_GROUP_IMAGE } from "../lib/constants";
import { usersTable } from "../schema";
import { eq, desc, not, and, gte, lte, notInArray } from "drizzle-orm";
import { MessageBody, notifyToUser } from "../lib/utils/notification";
import { groupMessageTable } from "../schema/groupMessage";
import { SocketEvents } from "../socket/eventnames";
import { SocketManager } from "../socket/socket";
import { groupMembersTable } from "../schema/groupMembers";
import { groupMeetingsTable } from "../schema/groupMeetings";
import MeetingQueue from "../jobs/meetingQueue";
import { MEETING_REMINDER_JOB } from "../jobs/constant";
import { SCHEDULED_MEETING_BUFFER_TIME } from "../constants";
import { StreamChannel } from "../stream/stream.channel";
import { StreamUtilities } from "../stream/stream.utils";
import { CloudinaryService } from "../lib/cloudinary";

export const createGroup:any = async (req: Request, res: Response) => {
    try {
        const { groupName, description, members, groupRules } = req.body;
        const createdBy = req.body.user.id;

        const [creator] = await db.select({
            name: usersTable.name,
        }).from(usersTable).where(eq(usersTable.id, createdBy)).limit(1);

        if (!groupName || !description || !members || !groupRules || !createdBy) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }
        const [group] = await db.insert(groupsTable).values({
            groupName,
            description,
            groupRules: groupRules.join(','),
            createdBy,
            groupImage: DEFAULT_GROUP_IMAGE,
            lastMessage: new Date(Date.now())
        }).returning();
        const groupMembers = members.map((memberId: number) => ({
            groupId: group.id,
            userId: memberId,
        }));
        await db.insert(groupMembersTable).values([...groupMembers, { groupId: group.id, userId: createdBy }]);
        const message = `${creator.name} created group ${groupName} with ${members.length - 1} others`;
        const messageBody:MessageBody = {
            title: 'New Group Created',
            message: message,
        }
        members.forEach((memberId: number) => {
            notifyToUser(memberId, messageBody);
        });
        return res.status(201).json({
            success: true,
            message: 'Group created successfully',
            group
        });
    } catch (error) {
        console.log('Error creating group:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

export const addUserToGroup:any = async (req: Request, res: Response) => {
    try {
        const { groupId, userId } = req.body;
        const id = req.body.user.id;

        if (!groupId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Group ID and User ID are required'
            });
        }
        const [_, [group], [user]] = await Promise.all([
            db.insert(groupMembersTable).values({
                groupId,
                userId
            }),
            db.select()
              .from(groupsTable)
              .where(eq(groupsTable.id, groupId))
              .limit(1),
            db.select({ name: usersTable.name })
              .from(usersTable)
              .where(eq(usersTable.id, id))
              .limit(1)
        ]);

        const message = (
            userId === id ? `Welcome to the group: ${group.groupName}` :
            `You have been added to the group: ${group.groupName} by ${user?.name || ''}`
        );
        const messageBody:MessageBody = {
            title: 'New Group Joined',
            message: message,
        }

        notifyToUser(userId, messageBody);

        return res.status(200).json({
            success: true,
            message: `User ${userId} added to group successfully`
        });

    } catch (error) {
        console.log('Error adding user to group:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


const notifyGroupMembers = async (
    members: number[], 
    groupId: number, 
    senderId: number, content: string,
    senderName:string,senderProfileImage:string,msgId:number,msgCreatedAt:Date) => {
    SocketManager.sendEventToGroup(groupId, SocketEvents.GROUP_MESSAGE_RECEIVED, {
        id: msgId,
        senderId,
        content,
        senderName,
        senderProfileImage,
        createdAt: msgCreatedAt,
        groupId
    });
};

export const handleGroupMessageReceived = async(groupId: number, userId: number, message: string,senderName:string,senderProfileImage:string) => {
    try {
        console.log('Group message received:', { groupId, userId, message });
        const msg = await db.transaction(async (tx)=>{
           const [msg]  = await tx.insert(groupMessageTable).values({
                groupId,
                senderId:userId,
                content:message,
                senderName,
                senderProfileImage,
                createdAt: new Date(Date.now())
            }).returning();
            await tx.update(groupsTable)
                .set({ lastMessage: new Date(Date.now()) })
                .where(eq(groupsTable.id, groupId));
            return msg;
        });
        process.nextTick(async () => {
            const groupMembers = await db.select({ userId: groupMembersTable.userId })
                .from(groupMembersTable)
                .where(eq(groupMembersTable.groupId, groupId));
            if (groupMembers.length <= 1) return;
            await notifyGroupMembers(groupMembers.map(m => m.userId), 
            groupId, userId, 
            message,senderName,
            senderProfileImage,msg.id,msg.createdAt);
        });
    } catch (error) {
        console.log('Error handling group message:', error);
    }
};


export const getGroupMessages = async (groupId: number, page = 1, limit = 20,userJoinedDate:Date) => {
    try {
        const safePage = Math.max(1, Math.floor(page));
        const safeLimit = Math.max(1, Math.floor(limit));
        const offset = (safePage - 1) * safeLimit;

        const messages = await db.select()
            .from(groupMessageTable)
            .where(
                and(
                    eq(groupMessageTable.groupId, groupId),
                    gte(groupMessageTable.createdAt, userJoinedDate)
                )
            )
            .orderBy(desc(groupMessageTable.createdAt))
            .limit(safeLimit)
            .offset(offset);
        return messages;
    } catch (error) {
        console.log('Error fetching group messages:', error);
        throw new Error('Failed to fetch group messages');
    }
};

export const getGroupMessagesPaginated:any = async (req: Request, res: Response) => {
    try {
        const groupIdParam = req.params.groupId;
        const userId = req.body.user.id || req.query.userId;
        if (!groupIdParam) {
            return res.status(400).json({
                success: false,
                message: 'Group ID is required'
            });
        }

        const groupId = parseInt(String(groupIdParam), 10);
        if (Number.isNaN(groupId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Group ID'
            });
        }
        const [memberShip] = await db.select().from(groupMembersTable).where(and(
            eq(groupMembersTable.groupId, groupId),
            eq(groupMembersTable.userId, userId)
        )).limit(1);
        if (!memberShip) {
            return res.status(403).json({
                success: false,
                message: 'User is not a member of the group'
            });
        }
        const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
        const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

        const messages = await getGroupMessages(groupId, page, limit+1,memberShip.createdAt);

        const hasMore = messages.length > limit;
        if(hasMore) messages.pop();
        return res.status(200).json({
            success: true,
            messages,
            hasMore,
            nextPage:page+1,
        });
    } catch (error) {
        console.log('Error in getGroupMessagesController:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


export const getGroups:any = async (req: Request, res: Response) => {
    try {
        const userId = req.body.user.id || req.query.userId;
        const isAlreadyMember = req.query.isAlreadyMember === 'true';
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        let groups: any[] = [];
        if (isAlreadyMember) {
            groups = await db.select({
                id: groupsTable.id,
                groupName: groupsTable.groupName,
                description: groupsTable.description,
                groupImage: groupsTable.groupImage,
                createdBy: groupsTable.createdBy,
                lastMessage: groupsTable.lastMessage,
            })
                .from(groupsTable)
                .innerJoin(groupMembersTable, eq(groupsTable.id, groupMembersTable.groupId))
                .where(eq(groupMembersTable.userId, Number(userId)))
                .orderBy(desc(groupsTable.lastMessage));
        } else {
         groups = await db
            .select()
            .from(groupsTable)
            .where(
                notInArray(
                groupsTable.id,
                db.select({ id: groupMembersTable.groupId })
                    .from(groupMembersTable)
                    .where(eq(groupMembersTable.userId, Number(userId)))
                )
            )
            .orderBy(desc(groupsTable.lastMessage));
        }
        return res.status(200).json({
            success: true,
            groups
        });
    } catch (error) {
        console.log('Error in getUserGroups:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}


export const getGroupDetails:any = async (req: Request, res: Response) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);
        if (isNaN(groupId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid group ID'
            });
        }

    const [[group], users, meetings] = await Promise.all([
            db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1),
            db.select({
            id: usersTable.id,
            name: usersTable.name,
            profilephoto: usersTable.profilephoto
            })
            .from(groupMembersTable)
            .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
            .where(eq(groupMembersTable.groupId, groupId)),
            db.select()
            .from(groupMeetingsTable)
            .where(and(
             eq(groupMeetingsTable.groupId, groupId),
             gte(groupMeetingsTable.meetingEndTime, new Date(Date.now()))
            ))
        ]);

        if (!group) {
            return res.status(404).json({
            success: false,
            message: 'Group not found'
            });
        }

        return res.status(200).json({
            success: true,
            group,
            users,
            meetings
        });
    } catch (error) {
        console.log('Error in getGroupDetails:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}



export const getGroupLiveMeetings:any = async(req: Request, res: Response) => {
    try {
        const groupId = parseInt(req.params.groupId, 10);
        if (isNaN(groupId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid group ID'
            });
        }
        const liveMeetings = await db.select()
            .from(groupMeetingsTable)
            .where(and(
                eq(groupMeetingsTable.groupId, groupId),
                lte(groupMeetingsTable.meetingStartTime,  new Date(Date.now())),
                gte(groupMeetingsTable.meetingEndTime, new Date(Date.now()))
            ));
        return res.status(200).json({
            success: true,
            liveMeetings
        });
    } catch (error) {
        console.log('Error in getGroupLiveMeetings:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}


export const scheduleMeeting:any = async(req: Request, res: Response) => {
    try {
        const userId = req.body.user.id;
        const {groupId,meetingStartTime,meetingEndTime,meetTitle,meetDescription} = req.body;

        if (!userId || !groupId || !meetingStartTime || !meetingEndTime || !meetTitle || !meetDescription) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        const newMeeting = {
            groupId,
            meetingStartTime:new Date(meetingStartTime),
            meetingEndTime:new Date(meetingEndTime),
            meetTitle,
            meetDescription,
            createdBy: userId
        };
        const [result] = await db.insert(groupMeetingsTable).values(newMeeting).returning();
        const delayInSeconds = ((result.meetingStartTime.getTime() - Date.now()) / 1000) - ( SCHEDULED_MEETING_BUFFER_TIME * 60 );
        MeetingQueue.getInstance().addJob(MEETING_REMINDER_JOB,{ meetingId: result.id }, delayInSeconds);
        return res.status(201).json({
            success: true,
            message: 'Meeting scheduled successfully'
        });
    } catch (error) {
        console.log('Error in scheduleMeeting:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}



export const joinGroupCall:any = async (req:Request,res:Response)=>{
   try {
     const userId = req.body.user.id;
     const callId = req.body.callId;
     if (!userId || !callId) {
         return res.status(400).json({
             success: false,
             message: 'Invalid user ID or call ID'
         });
     }
     await StreamChannel.addUserToCall({ callId: callId.toString(), userId,isGroupCall:true });
     const callEntryDetails = StreamUtilities.buildObjectForUser({ userId, callId,isGroupCall:true });
     return res.status(200).json({
         success: true,
         message: 'User added to call successfully',
         callEntryDetails
     });
   } catch (error) {
       console.log('Error in joinGroupCall:', error);
       return res.status(500).json({
           success: false,
           message: 'Internal server error'
       });
   }
}


export const startInstantCall:any = async(req:Request,res:Response)=>{
    try {
        const userId = req.body.user.id;
        const { groupId, meetTitle, meetDescription } = req.body;

        // fetch group and members in parallel
        const [groupRows, groupMembers] = await Promise.all([
            db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1),
            db.select({ userId: groupMembersTable.userId })
              .from(groupMembersTable)
              .where(eq(groupMembersTable.groupId, groupId))
        ]);
        const [group] = groupRows;

        if (!group) {
            return res.status(404).json({
                success: false,
                message: 'Group not found'
            });
        }

        // create call
        const callId = await StreamChannel.createGroupCall(groupId, userId, StreamUtilities.getMaxCallDurationInSeconds());

        // add user to call and insert meeting concurrently
        const meetingValues = {
            streamCallId: callId,
            groupId,
            meetTitle,
            meetDescription,
            createdBy: userId,
            meetingStartTime: new Date(),
            meetingEndTime: new Date(Date.now() + (StreamUtilities.getMaxCallDurationInSeconds() * 1000)),
        };
        const [[newMeeting]] =await Promise.all([
            // StreamChannel.addUserToCall({ callId: callId.toString(), userId }),
            db.insert(groupMeetingsTable).values(meetingValues).returning()
        ]);

        // notify members in parallel (excluding the starter)
        const notifyPromises = groupMembers
            .filter(m => m.userId !== userId)
            .map(m => notifyToUser(m.userId, {
                title: 'Instant Meeting Started',
                message: `${meetTitle} has started on ${group.groupName}`,
            } as MessageBody));
        // emit socket event before/while notifications run
        SocketManager.sendEventToGroup(groupId, SocketEvents.INSTANT_MEETING, {data:newMeeting});
        await Promise.all(notifyPromises);

        // const callEntryDetails = StreamUtilities.buildObjectForUser({ userId, callId });
        return res.status(200).json({
            success: true,
            message: 'Instant call started successfully',
        });
    } catch (error) {
        console.log('Error in startInstantCall:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}



export const handleSelfAction:any = async(req:Request,res:Response)=>{
   try {
     const {groupId,isJoin} = req.body;
     const userId = req.body.user.id;
     if(isJoin){
        await db.insert(groupMembersTable).values({ groupId, userId });
     }else{
        await db.delete(groupMembersTable).where(and(
            eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)
        ));
     }
     return res.status(200).json({
         success: true,
         message: `User ${isJoin ? 'joined' : 'left'} the group successfully`,
         isJoin
     });
   } catch (error) {
       console.log('Error in handleSelfAction:', error);
       return res.status(500).json({
           success: false,
           message: 'Internal server error'
       });
   }
}

export const updateGroupDetails:any = async(req:Request,res:Response)=>{
    try {
        const groupId = parseInt(req.params.groupId, 10);
        const { groupName, description, groupRules } = req.body;
        const image = req.file as Express.Multer.File;
        let imageUrl = null;
        if(image){
            const {url} = await CloudinaryService.getInstance().uploadBuffer(image.buffer);
            imageUrl = url;
        }
        if (!groupName || !description || !groupRules) {
            return res.status(400).json({
                success: false,
                message: 'Group name, description, and rules are required'
            });
        }

        const updateData = {
            groupName,
            description,
            groupRules,
            ...(imageUrl && { groupImage: imageUrl })
        };

        const [group] = await db.update(groupsTable).set(updateData).where(eq(groupsTable.id, groupId)).returning();

        return res.status(200).json({
            success: true,
            message: 'Group details updated successfully',
            data: group
        });
    } catch (error) {
        console.log('Error updating group details:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};