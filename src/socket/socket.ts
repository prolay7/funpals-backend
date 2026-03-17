import { Server, Socket } from 'socket.io';
import { verifyJwt } from '../lib/helper';
import { SocketEvents } from './eventnames';
import { hadnleMessageReceived } from '../controlers/chat';
import { userStatus, userStatusType } from '../lib/constants';
import { handleMeetInviteResposeFromTarget, handleUserAvaibility, handleUserStatusUpdate } from '../controlers/user';
import RedisClient from '../redis';
import { getUserSocketKey } from '../redis/keys';
import { getGroupRoomKey } from './socket-keys';
import { handleGroupMessageReceived } from '../controlers/group';


export class SocketManager {
  private static instance: SocketManager;
  private static io: Server;

  private constructor(io: Server) {
    SocketManager.io = io;
    io.use((socket, next) => {
      try {
        console.log(socket.handshake?.headers?.token as string)
        const token = socket.handshake?.headers?.token as string;
        if (!token) {
          return next(new Error("No token provided"));
        }
        const payload = verifyJwt(token);
        socket.data.user = payload;
        next();
      } catch (error) {
        return next(new Error('Something went wrong 53'))
      }
    })
    this.setupListeners();
  }
  public static initSocket(io: Server) {
    SocketManager.instance = new SocketManager(io);
    console.log('Socket initialised')
  }
  public static getInstance(io: Server): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager(io);
    }
    return SocketManager.instance;
  }

  private setupListeners(): void {

    SocketManager.io.on(SocketEvents.CONNECTION, async(socket: Socket) => {
      const userId = socket.data?.user?.id;
      console.log('Client connected:', userId, " ", socket.id);
      if(userId){
        socket.join(userId.toString());
        console.log('Client joined in his room',userId);
        await RedisClient.getInstance()?.sadd(getUserSocketKey(userId), socket.id);
        await handleUserStatusUpdate(userId,userStatus.ONLINE);
      }else{
        console.warn('No user ID found in socket data. Disconnecting socket.');
        socket.disconnect(true);
        return;
      }
      socket.on(SocketEvents.DISCONNECT, async() => {
        console.log('Client disconnected:', userId , " ", socket.id);
        await RedisClient.getInstance()?.srem(getUserSocketKey(userId), socket.id);
        const remainingSockets = await RedisClient.getInstance()?.scard(getUserSocketKey(userId));
        if(remainingSockets===0){
          await handleUserStatusUpdate(userId,userStatus.OFFLINE);
        }
      });
      socket.on(SocketEvents.PRESENCE_UPDATE,(status:userStatusType)=>{
          console.log("Presence update received for user:", userId, "Status:", status);
          handleUserStatusUpdate(userId,status);
      })
      socket.on(SocketEvents.MEET_INVITE_RESPONCE_FROM_TARGET,(data:{isAccepted:boolean})=>{
          handleMeetInviteResposeFromTarget({isAccepted:data?.isAccepted,targetUserId:userId});
      });

      socket.on(SocketEvents.SEND_PRIVATE_MESSAGE,({receiver,conversationId,content}:{receiver:number,conversationId:number,content:string})=>{
        console.log("private message sent:",receiver,conversationId,content);
        hadnleMessageReceived(socket.data?.user?.id,receiver,conversationId,content);
      });
      socket.on(SocketEvents.AVAILABILITY_UPDATE,(data)=>handleUserAvaibility(userId,data))


      socket.on(SocketEvents.JOIN_GROUP_ROOM,(groupId:number)=>{
        socket.join(getGroupRoomKey(groupId));
        console.log('Client joined group room:', groupId, " ", socket.id);
      });
      socket.on(SocketEvents.LEAVE_GROUP_ROOM,(groupid:number)=>{
        socket.leave(getGroupRoomKey(groupid));
        console.log('Client left group room:', groupid, " ", socket.id);
      });
      socket.on(SocketEvents.BROADCAST_GROUP_MESSAGE,(data:{groupId:number,content:string,senderName:string,senderProfileImage:string})=>{
         handleGroupMessageReceived(data.groupId, socket.data?.user?.id, data.content,data.senderName,data.senderProfileImage);
      });
    });
  }

  public static emitToAll(event: string, data: any): void {
    SocketManager.io.emit(event, data);
  }

  public static sendEventToUser(userid: number, eventName: string, data: any) {
    SocketManager.io.to(userid?.toString()).emit(eventName, data);
  }

  public static sendEventToGroup(groupId: number, eventName: string, data: any) {
    SocketManager.io.to(getGroupRoomKey(groupId)).emit(eventName, data);
  }
}
