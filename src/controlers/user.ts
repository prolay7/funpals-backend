import { and, eq, gte, inArray, not, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { categoriesTable, groupMeetingsTable, groupMembersTable, issueTable, likedUsersTable, SkillsTable, userLikedCategoriesTable, usersTable } from "../schema";
import { Request,Response } from "express";
import { userStatus, userStatusType } from "../lib/constants";
import { SocketManager } from "../socket/socket";
import { SocketEvents } from "../socket/eventnames";
import { CloudinaryService } from "../lib/cloudinary";
import { createMeetLinkOrRoomToken, handlePrivateMeetingAccepted } from "./meeting";
import RedisClient from "../redis";
import { getUserKey, getUserSocketKey, MEETING_REQUEST_KEY } from "../redis/keys";
import { StreamChannel } from "../stream/stream.channel";
import { StreamUserRole } from "../enums/stream";
import { getAllSkillsOfUser } from "./skillController";
import { StreamUtilities } from "../stream/stream.utils";

export const createOrupdateuser = async ({name,email,profilephoto,googlerefreshtoken}:{name:string,email:string,profilephoto:string,
    googlerefreshtoken?:string})=>{
    if(!name || !email || !profilephoto) throw new Error('All fields are required');
    try {
        const [user] = await db.insert(usersTable).values({
            name,
            email,
            profilephoto
      }).onConflictDoUpdate(
        {
          target: [usersTable.email],
          set: {
            updatedAt: new Date(Date.now()),
          }
        }
      ).returning({
          id:usersTable.id,
          name:usersTable.name,
          email:usersTable.email,
          profilePhoto:usersTable.profilephoto,
          isSpecialCategoryOptIn:usersTable.isSpecialCategoryOptIn,
          isCussWordOn:usersTable.isCussWordOn,
          longitude: sql<number>`ST_X(${usersTable.location}::geometry)`,
          latitude: sql<number>`ST_Y(${usersTable.location}::geometry)`,
          locationDisplayName:usersTable.locationDisplayName,
        });
        if(!user) throw new Error('Something went wrong 50');
       const [userLikedCategories,_] = await Promise.all([
            db.select({
              categoryId: categoriesTable.id,
              categoryName: categoriesTable.name,
              isSpecial: categoriesTable.isSpecial,
              priority: categoriesTable.priority  
            })
          .from(userLikedCategoriesTable)
          .leftJoin(categoriesTable, eq(userLikedCategoriesTable.categoryId, categoriesTable.id))
          .where(eq(userLikedCategoriesTable.userId, user.id)),
       StreamChannel.upsertUser({id:user.id,role:StreamUserRole.USER,name:user.name,profilephoto:user.profilePhoto!})
       ])
        return {
          user:{
            ...user,
            location:{
              lat: user.latitude,
              lng: user.longitude,
              displayName: user.locationDisplayName
            }
          },
          userLikedCategories
        };
    } catch (error) {
      console.log('Error while creating user => ',error);
      throw new Error('Something went wrong 51');
    }
}

export const init:any = async(req:Request,res:Response)=>{
   try {
    const {id} = req.body.user;
    const [user, userLikedCategories] = await Promise.all([
    db.select({
      id:usersTable.id,
      name:usersTable.name,email:usersTable.email,
      profilePhoto:usersTable.profilephoto
      ,isSpecialCategoryOptIn:usersTable.isSpecialCategoryOptIn,
      isCussWordOn:usersTable.isCussWordOn,
      location:{
        lng:sql<number>`ST_X(${usersTable.location}::geometry)`,
        lat:sql<number>`ST_Y(${usersTable.location}::geometry)`,
        displayName:usersTable.locationDisplayName
      },
    }).from(usersTable).where(eq(usersTable.id, id)).limit(1).then(rows => rows[0]),
    db.select({
      categoryId: categoriesTable.id,
      categoryName: categoriesTable.name,
      isSpecial: categoriesTable.isSpecial,
      priority: categoriesTable.priority 
    })
      .from(userLikedCategoriesTable)
      .leftJoin(categoriesTable, eq(userLikedCategoriesTable.categoryId, categoriesTable.id))
      .where(eq(userLikedCategoriesTable.userId, id)),
  ]); 
  await StreamChannel.upsertUser({id,role:StreamUserRole.USER,name:user.name,profilephoto:user.profilePhoto!})    
    return res.status(200).json({
        success:true,
        message:'user details fetched',
        user,
        userLikedCategories,
        userLikedUsers:[]
    })   
   } catch (error) {
    console.log("Error while getting user details => ",error)
     return res.status(500).json({
        success:false,
        message:"Internal server errro"
     })
   }
}


export const likeUser:any = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const { id } = req.body.user;
  
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
  
      await db.insert(likedUsersTable).values({ userId: id, likedUserId: Number(userId) });
  
      return res.status(200).json({ success: true, message: 'User liked successfully' });
    } catch {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
 
  export const dislikeUser:any = async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const { id } = req.body.user;
  
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
  
      await db.delete(likedUsersTable).where(
        and(eq(likedUsersTable.userId, id), eq(likedUsersTable.likedUserId, Number(userId)))
      );
  
      return res.status(200).json({ success: true, message: 'User disliked successfully' });
    } catch {
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  

  export const getUserLikedUsers:any = async(req:Request,res:Response)=>{
    try {
      const {id} = req.body.user;
      const users = await db.select({
        id:usersTable.id,
        name:usersTable.name,
        email:usersTable.email,
        profilePhoto:usersTable
        .profilephoto
      }).from(likedUsersTable).leftJoin(
        usersTable,
        eq(likedUsersTable.likedUserId,usersTable.id)
      ).where(eq(likedUsersTable.userId,id));
      return res.status(200).json({
        success:true,
        message:'Liked users',
        users
      })
    } catch (error) {
      return res.status(500).json({
        success:false,
        message:"Internal server errro"
     })
    }
  }


  export const handleUserStatusUpdate = async(userId:number,status:userStatusType)=>{
     try {
        if(status===userStatus.OFFLINE){
          await Promise.all([
            RedisClient.getInstance()?.del(getUserKey(userId)),
            RedisClient.getInstance()?.removeUserFromOnlineList(userId)
          ]);
        }else if(status===userStatus.ONLINE){
          await Promise.all([
            RedisClient.getInstance()?.set(getUserKey(userId),status),
            RedisClient.getInstance()?.addUserToOnlineList(userId)
          ]);
        }else{
          await Promise.all([
            RedisClient.getInstance()?.set(getUserKey(userId),status),
            RedisClient.getInstance()?.removeUserFromOnlineList(userId)
          ]);
        }
        SocketManager.emitToAll(SocketEvents.PRESENCE_UPDATE,{userId,status});
     } catch (error) {
      
     }
  }
  
  export const MultipleUserStatusUpdate = async(userIds:number[],status:userStatusType)=>{
    if(status===userStatus.OFFLINE){
      await Promise.all([
        await RedisClient.getInstance()?.multiDel(userIds.map(userId => getUserKey(userId))),
        RedisClient.getInstance()?.removeUsersFromOnlineList(userIds)
      ]);
    }else{
      const pairs = userIds.map(userId => [getUserKey(userId),status]);
      await RedisClient.getInstance()?.multiSet(pairs);
    }
    userIds.forEach((userId)=>{
      SocketManager.emitToAll(SocketEvents.PRESENCE_UPDATE,{userId,status});
    })
  }

  export const updateDetails:any = async(req:Request,res:Response)=>{
    try {
      const {name,isCussWordOn,isSpecialCategoryOptIn,bio,canDo,cannotDo,interests,availableFor,expertiseLevel,zipCode,gender,agerange,notificationFrequency} = req.body;
      const {id} = req.body.user;
      if(!name && isCussWordOn===undefined && isSpecialCategoryOptIn===undefined
        && !bio && !canDo && !cannotDo && !interests && !availableFor && expertiseLevel===undefined
        && !zipCode && !gender && agerange===undefined && !notificationFrequency) return res.status(400).json({
        success:false,
        message:'Required fields are missing'
      })
      type UpdateValues = {
        name?: string;
        isCussWordOn?: boolean;
        isSpecialCategoryOptIn?: boolean;
        bio?: string;
        canDo?: string;
        cannotDo?: string;
        interests?: string;
        availableFor?: string;
        expertiseLevel?: number;
        zipCode?: string;
        gender?: string;
        agerange?: number;
        notificationFrequency?: string;
      };
      const updateValues: UpdateValues = {};
      if (name) updateValues.name = name;
      if (typeof isCussWordOn === 'boolean') updateValues.isCussWordOn = isCussWordOn;
      if (typeof isSpecialCategoryOptIn === 'boolean') updateValues.isSpecialCategoryOptIn = isSpecialCategoryOptIn;
      if (bio !== undefined) updateValues.bio = bio;
      if (canDo !== undefined) updateValues.canDo = canDo;
      if (cannotDo !== undefined) updateValues.cannotDo = cannotDo;
      if (interests !== undefined) updateValues.interests = interests;
      if (availableFor !== undefined) updateValues.availableFor = availableFor;
      if (expertiseLevel !== undefined) updateValues.expertiseLevel = Number(expertiseLevel);
      if (zipCode !== undefined) updateValues.zipCode = zipCode;
      if (gender !== undefined) updateValues.gender = gender;
      if (agerange !== undefined) updateValues.agerange = Number(agerange);
      if (notificationFrequency !== undefined) updateValues.notificationFrequency = notificationFrequency;
      await db.update(usersTable).set(updateValues).where(eq(usersTable.id,id));
      return res.status(200).json({
        success:true,
        message:'Details updated successfully'
      })
    } catch (error) {
      return res.status(500).json({
        success:false,
        message:'Internal server error'
      })
    }
  }


  export const updateProfilePhoto:any = async(req:Request,res:Response)=>{
    try {
      const image = req.file as Express.Multer.File;
      const {id} = req.body.user;
      if(!image) return res.status(400).json({
        success:false,
        message:'Image is required'
      })
      const {url:profilePhoto} = await CloudinaryService.getInstance().uploadBuffer(image.buffer);
      await db.update(usersTable).set({profilephoto:profilePhoto}).where(eq(usersTable.id,id));
      return res.status(200).json({
        success:true,
        message:'Profile photo updated successfully',
        profilePhoto
      })
    } catch (error) {
      return res.status(500).json({
        success:false,
        message:'Internal server error'
      })
    }
  }

  export const handleMeetInviteResposeFromTarget = 
  async ({     
          isAccepted,
          targetUserId
        }:{
          isAccepted:boolean,
          targetUserId:number
        })=>{
          const invitation = await RedisClient.getInstance()?.hgetWithJson(getUserKey(targetUserId),MEETING_REQUEST_KEY);
          const {creatorUserId:creatorId,meetTitle,meetDesc,meetCategory,isCussWordOn,isSpecialCategory,isPrivate} = invitation;
          const [user] = await db.select({
            name:usersTable.name,
            profilephoto:usersTable.profilephoto
          }).from(usersTable).where(eq(usersTable.id,targetUserId)).limit(1);
          if(!isAccepted){
            SocketManager.sendEventToUser(creatorId,SocketEvents.MEET_INVITE_DECLINED,user);
            const remainingCreatorSockets = await RedisClient.getInstance()?.scard(getUserSocketKey(creatorId));
            if(remainingCreatorSockets===0){
               await handleUserStatusUpdate(creatorId,userStatus.OFFLINE);
            }else{
              await handleUserStatusUpdate(creatorId,userStatus.ONLINE);
            }
            const remainingTargetSockets = await RedisClient.getInstance()?.scard(getUserSocketKey(targetUserId));
            if(remainingTargetSockets===0){
              await handleUserStatusUpdate(targetUserId,userStatus.OFFLINE);
            }else{
              await handleUserStatusUpdate(targetUserId,userStatus.ONLINE);
            }
            await RedisClient.getInstance()?.hdel(getUserKey(targetUserId),MEETING_REQUEST_KEY);
             return;
          }
          const creatorStatus = await RedisClient.getInstance()?.getStatusOfUser(creatorId);
          if(creatorStatus == userStatus.OFFLINE){
            await handleUserStatusUpdate(targetUserId,userStatus.ONLINE);
            await RedisClient.getInstance()?.hdel(getUserKey(targetUserId),MEETING_REQUEST_KEY);
            SocketManager.sendEventToUser(targetUserId,SocketEvents.SOMETHING_WENT_WRONG,{message:'The user is not online now'});
            return;
          }
          SocketManager.sendEventToUser(creatorId,SocketEvents.MEET_INVITE_ACCEPTED,user);
          await RedisClient.getInstance()?.hdel(getUserKey(targetUserId),MEETING_REQUEST_KEY);
          if(!isPrivate){
            createMeetLinkOrRoomToken({
                creatorUserId:creatorId,
                targetUserId:targetUserId,
                meetTitle,
                meetDesc,
                meetCategory,
                isCussWordOn,
                isSpecialCategory
          });
        }else{
           handlePrivateMeetingAccepted({
               creatorUserId:creatorId,
               targetUserId:targetUserId
           });
        }
    }


export const updateFcmToken:any = async (req:Request,res:Response)=>{
  try {
    const {fcmToken} = req.body;
    const {id} = req.body.user;
    if(!fcmToken) return res.status(400).json({
      success:false,
      message:'Fcm token is required'
    })
    await db.update(usersTable).set({fcmToken}).where(eq(usersTable.id,id));
    return res.status(200).json({
      success:true,
      message:'Fcm token updated successfully'
    })
  } catch (error) {
    return res.status(500).json({
      success:false,
      message:'Internal server error'
    })
  }
}    




export const getOtherCommonUsers:any = async(req:Request,res:Response)=>{
   try {
    const {id} = req.body.user;
    let {limit=10,page=1,userName}:{limit?:number,page?:number,userName?:string} = req.query;
    limit = Number(limit);
    page = Number(page);
    const offset:number = (page-1)*limit;
    const result = await db.execute(sql`SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.profile_photo AS user_profilephoto,
    json_agg(
      json_build_object('id', c.id, 'name', c.name, 'isSpecial', c.is_special)
    ) AS common_categories
  FROM "userLikedCategories" ulc1
  JOIN "userLikedCategories" ulc2 
    ON ulc1.category_id = ulc2.category_id 
    AND ulc1.user_id != ulc2.user_id
  JOIN users u ON u.id = ulc2.user_id
  JOIN categories c ON c.id = ulc2.category_id
  WHERE ulc1.user_id = ${id}
  ${userName ? sql`AND u.name ILIKE ${'%' + userName + '%'}` : sql``}
  GROUP BY u.id
  ORDER BY u.updated_at DESC
  LIMIT ${limit + 1} OFFSET ${offset}`);
  if(result.rows.length===0) return res.status(200).json({
    success:true,
    message:'No common users found',
    users:[],
    hasMore:false,
    nextPage:page+1
  });
  const hasMore = result.rows.length>limit;
  if(hasMore) result.rows.pop();
  const keys = result.rows.map((user:any)=>{
    return getUserKey(user?.user_id);
  });
  const statuses = await RedisClient.getInstance()?.multiGet(keys);
  const users = result.rows.map((user:any,index:number)=>{
    return {
       ...user,
       status: statuses[index] || 'offline',
     }
   });
   return res.status(200).json({
     success:true,
     message:'Common users fetched successfully',
     users,
     hasMore,
     nextPage:page+1
   });
   } catch (error) {
    console.log(error);
    return res.status(500).json({
      success:false,
      message:'Internal server error'
    })  
   }
}




export const getUserProfile:any = async(req:Request,res:Response)=>{
  try {
    const userId = Number(req.params.userId);
    const [user] = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      profilephoto: usersTable.profilephoto,
      isCussWordOn: usersTable.isCussWordOn,
      isSpecialCategoryOptIn: usersTable.isSpecialCategoryOptIn,
      createdAt: usersTable.createdAt,
      agerange: usersTable.agerange
    }).from(usersTable).where(eq(usersTable.id,userId)).limit(1);
    const skills = await getAllSkillsOfUser(userId);
    const issues = await db.select(
      {
            id:issueTable.id,
            title:issueTable.title,
            userId:issueTable.userId,
            description:issueTable.description,
            createdAt:issueTable.createdAt,
            updatedAt:issueTable.updatedAt,
            isPublic:issueTable.isPublic,
            status:issueTable.status,
            category:{
                id:categoriesTable.id,
                name:categoriesTable.name
            }
      }
    ).from(issueTable).
    innerJoin(categoriesTable, eq(issueTable.category, categoriesTable.id)).where(
      and(
        eq(issueTable.userId, userId),
        eq(issueTable.isPublic, true)
      )
    );
    const categories = await db.select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      isSpecial: categoriesTable.isSpecial
    }).from(userLikedCategoriesTable).innerJoin(categoriesTable, eq(userLikedCategoriesTable.categoryId, categoriesTable.id)).where(eq(userLikedCategoriesTable.userId, userId));
    const status = await RedisClient.getInstance()?.getStatusOfUser(userId);
    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      user,
      skills,
      issues,
      status,
      categories
    });
  } catch (error) {
     console.log('Error fetching user profile:', error)
     return res.status(500).json({
        success:false,
        message:'Internal server error'
     })
  }
}


export const getUserUpcomingMeetings:any = async(req:Request,res:Response)=>{
    try {
      const userId = req.body.user.id;
      const userGroups = await db.select({groupId: groupMembersTable.groupId}).from(groupMembersTable).where(eq(groupMembersTable.userId, userId));
      const groupIds = userGroups.map((group:any) => group.groupId);
      if(groupIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No upcoming meetings found',
          meetings: []
        });
      }
      const meetings = await db.select().from(groupMeetingsTable).where(
        and(
            inArray(groupMeetingsTable.groupId, groupIds),
            gte(groupMeetingsTable.meetingEndTime, new Date(Date.now())),
        )
      );
      return res.status(200).json({
        success: true,
        message: 'Upcoming meetings fetched successfully',
        meetings
      });
    } catch (error) {
      console.log('Error fetching upcoming meetings:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
}

export const handleUserAvaibility = async(userId:number,nextAvailability:number)=>{
  try {
    await db.update(usersTable).set({nextAvailability}).where(eq(usersTable.id,userId));
  } catch (error) {
     console.log('Error updating user availability:', error);
  }
}


export const getAllOnlineUsers: any = async (req: Request, res: Response) => {
  try {
    const { cursor, limit } = req.query;
    const safeCursor = String(cursor || "0");
    const safeLimit = Number(limit) || 10;
    const currentUserId = req.body.user.id;
    
    const [nextCursor, userIds] =
      (await RedisClient.getInstance()?.sscan("online_users", safeCursor, safeLimit + 1)) || [
        "0",
        [],
      ];
    const ids:number[] = [];
    userIds.forEach((id:string)=>{
      const numberUserId = Number(id);
      if(numberUserId !== currentUserId) ids.push(numberUserId);
    })
    if (ids.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No online users found",
        users: [],
        hasMore: false,
        nextCursor,
      });
    }
    let users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        profilephoto:usersTable.profilephoto
      })
      .from(usersTable)
      .where(inArray(usersTable.id, ids));
      users = users.map((user)=>{
        return{...user,status:userStatus.ONLINE}
      })
    return res.status(200).json({
      success: true,
      message: "Online users fetched successfully",
      users,
      hasMore: nextCursor !== "0",
      nextCursor,
    });

  } catch (error) {
    console.log("Error fetching online users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
