import {Request,Response} from 'express';
import { db } from '../lib/db';
import { conversationsTable, messagesTable, usersTable } from '../schema';
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm';
import { SocketManager } from '../socket/socket';
import { SocketEvents } from '../socket/eventnames';
import { getUserKey } from '../redis/keys';
import RedisClient from '../redis';
import { userStatus } from '../lib/constants';
import { CHAT_IMAGE_NOTIFICATION_TYPE, notificationService } from '../firebase/notification';

export const getMessages:any = async(req:Request,res:Response)=>{
  try {
    const {userId} = req.query;
    const {id} = req.body?.user;
    if(!userId){
        return res.status(404).json({
            success:false,
            message:'userId is required'
        })
    }
    const messages = await db.select({message:messagesTable.content,createdAt:messagesTable.createdAt}).from(messagesTable).where(or(
        and(
           eq(messagesTable.senderId,Number(userId)),
           eq(messagesTable.receiverId,id)
        ),
        and(
           eq(messagesTable.senderId,id),
           eq(messagesTable.receiverId,Number(userId))
        )
    )).orderBy(desc(messagesTable.createdAt));
    return res.status(200).json({
        success:true,
        message:'Messages fetched',
        messages
    })
  } catch (error) {
    return res.status(500).json({
        success:false,
        message:'Internal server error'
    })
  }
}


export const getOrCreateConversation: any = async (req: Request, res: Response) => {
  try {
    const userIdParam = Number(req.query.userId);
    const currentUserId = req.body?.user?.id;
    const safePage = Math.max(1,  Number(req.query.page));
    const safeLimit = Math.max(1, Number(req.query.limit));
    const offset = (safePage - 1) * safeLimit;

    if (!userIdParam) {
      return res.status(400).json({
        success: false,
        message: 'Valid userId is required',
      });
    }

    const [usera, userb] = currentUserId < userIdParam
      ? [currentUserId, userIdParam]
      : [userIdParam, currentUserId];

    const [existingConversation] = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
          and(eq(conversationsTable.usera, usera), eq(conversationsTable.userb, userb)),
      )
      .limit(1);

    if (existingConversation) {
      const messages = await db
        .select({
          id:messagesTable.id,
          senderId:messagesTable.senderId,
          content:messagesTable.content,
        })
        .from(messagesTable)
        .where(eq(messagesTable.convresation, existingConversation.id)).orderBy(desc(messagesTable.createdAt)).limit(safeLimit+1).offset(offset);
       const hasMore = messages.length > safeLimit;
       if (hasMore) {
         messages.pop();
       }
      return res.status(200).json({
        success: true,
        message: 'Conversation found',
        conversationId: existingConversation.id,
        messages,
        hasMore,
        nextPage:safePage + 1
      });
    }

    const [newConversation] = await db
      .insert(conversationsTable)
      .values({
        usera: usera,
        userb: userb,
      })
      .returning();

    return res.status(200).json({
      success: true,
      message: 'New conversation created',
      conversationId: newConversation.id,
      messages: [],
      hasMore: false,
      nextPage: safePage + 1
    });

  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};


export const getUserConversations: any = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.body?.user?.id;

    if (!currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
      });
    }

    const conversations = await db
      .select({
        conversationId: conversationsTable.id,
        lastMessage: {
          content: messagesTable.content,
          senderId:messagesTable.senderId,
          createdAt: messagesTable.createdAt,
        },
        otherUser: {
          id: usersTable.id,
          name: usersTable.name,
          profilePhoto:usersTable.profilephoto,
        }
      })
      .from(conversationsTable)
      .leftJoin(messagesTable, eq(conversationsTable.lastmessage, messagesTable.id))
      .leftJoin(
        usersTable,
        or(
          and(eq(conversationsTable.usera, currentUserId), eq(usersTable.id, conversationsTable.userb)),
          and(eq(conversationsTable.userb, currentUserId), eq(usersTable.id, conversationsTable.usera))
        )
      )
      .where(or(
        eq(conversationsTable.usera, currentUserId),
        eq(conversationsTable.userb, currentUserId)
      )).orderBy(desc(conversationsTable.updatedAt));
  
      const keys = conversations.map((conversation) =>
        conversation?.otherUser ? getUserKey(conversation.otherUser.id) : ''
      );
      const filteredKeys = keys.filter((key) => key !== '');
      const statuses = filteredKeys.length
        ? await RedisClient.getInstance()?.multiGet(filteredKeys)
        : [];
      const formattedConversations = conversations.map((conversation, index) => {
        if (conversation?.otherUser) {
          return {
            ...conversation,
            otherUser: {
              ...conversation.otherUser,
              status: statuses?.[index] || 'offline',
            },
          };
        }
        return conversation;
      });
    return res.status(200).json({
      success: true,
      message: 'Fetched conversations',
      conversations:formattedConversations
    });

  } catch (error) {
    console.error('Error in getUserConversations:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

export const hadnleMessageReceived=async(senderId:number,receiverId:number,conversationId:number,content:string)=>{
   try {

    const message = await db.transaction(async (tx) => {
    const [newMessage] = await tx.insert(messagesTable).values({
    senderId,
    receiverId,
    content,
    convresation: conversationId,
  }).returning();

   await tx.update(conversationsTable)
     .set({ lastmessage: newMessage.id,updatedAt: new Date(Date.now()) })
    .where(eq(conversationsTable.id, conversationId));

    return newMessage;
   });

   process.nextTick( async ()=>{
      const status = await RedisClient.getInstance()?.get(getUserKey(receiverId));
      if(status!=userStatus.ONLINE){
         const users = await db.select({
             id: usersTable.id,
             name: usersTable.name,
             profilePhoto: usersTable.profilephoto,
             fcmToken: usersTable.fcmToken
            }).from(usersTable).where(inArray(usersTable.id, [senderId, receiverId]));
         const sender = users.find(user => user.id === senderId);
         const receiver = users.find(user => user.id === receiverId);
         if(!receiver?.fcmToken || !sender) return;
         const messageBody = {
             title: `${sender.name} sent you a message`,
             message: content,
             image: sender?.profilePhoto!
         };
          // ------------
          // here i am changing  
          await notificationService.sendNotification(
            receiver?.fcmToken,
            messageBody,
            CHAT_IMAGE_NOTIFICATION_TYPE,
            sender?.id,
            sender?.name
          );
         return;
      }
      SocketManager.sendEventToUser(receiverId,SocketEvents.PRIVATE_MESSAGE_RECEIVED,{
           senderId:message.senderId,
           content:message.content
        });
   })
   } catch (error) {
    
   }
}