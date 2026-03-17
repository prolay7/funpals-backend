import {  UserRequest } from "@stream-io/node-sdk";
import { StreamUtilities } from "./stream.utils";
import { StreamCallClient } from "./stream.client";
import { StreamCallType, StreamUserRole } from "../enums/stream";

export class StreamChannel{
    public static async upsertUser({id,role,name,profilephoto}:{id:number,role:StreamUserRole,name:string,profilephoto:string}){
        const newUser :UserRequest = {
            id:StreamUtilities.getUserId(id),
            role,
            name,
            image:profilephoto
        }
        const streamClient = StreamCallClient.getInstance();
        await streamClient.upsertUsers([newUser]);
    }

    public static generateTokenForUser(id:number){
        const streamClient = StreamCallClient.getInstance();
        return streamClient.generateUserToken({user_id:StreamUtilities.getUserId(id),validity_in_seconds:StreamUtilities.getTokenValidityInSeconds()});
    }

    public static async createNewCall({creatorId,friendId}:{creatorId:number,friendId:number}){
        console.log('Creating call',creatorId,friendId);
        const callId = StreamUtilities.getCallId(StreamUtilities.getUserId(creatorId),StreamUtilities.getUserId(friendId));
        const callClient = StreamCallClient.getInstance();
        const call =  callClient.video.call(StreamCallType.DEFAULT,callId);
        await call.getOrCreate({
            data:{
                created_by_id:StreamUtilities.getUserId(creatorId),
                members:[
                    {
                    user_id:StreamUtilities.getUserId(creatorId),
                    role:StreamUserRole.ADMIN
                  },
                  {
                    user_id:StreamUtilities.getUserId(friendId),
                    role:StreamUserRole.ADMIN
                  }
               ],
               settings_override:{
                  limits:{
                    max_duration_seconds: StreamUtilities.getMaxCallDurationInSeconds()
                  },
                  audio:{
                    default_device:"speaker",
                    speaker_default_on:true
                  }
               }
            }
        });
        return callId;
    }
    

    public static async createGroupCall(groupId:number,creatorId:number,durationInSeconds:number = StreamUtilities.getMaxCallDurationInSeconds()){
        const callId = StreamUtilities.getGroupCallId(groupId.toString());
        const callClient = StreamCallClient.getInstance();
        const call = callClient.video.call(StreamCallType.GROUP,callId);
        await call.getOrCreate({
            data:{
                created_by_id:StreamUtilities.getUserId(creatorId),
                settings_override:{
                  limits:{
                    max_duration_seconds: durationInSeconds
                  },
                  audio:{
                    default_device:"speaker",
                    speaker_default_on:true
                  }
               }
            }
        });
        return callId;
    }


    public static async addUserToCall({callId,userId,isGroupCall}:{callId:string,userId:number,isGroupCall?:boolean}){
        const callClient = StreamCallClient.getInstance();
        const call =  callClient.video.call(isGroupCall ? StreamCallType.GROUP : StreamCallType.DEFAULT,callId);
        await call.updateCallMembers({
            update_members: [
                {
                    user_id:StreamUtilities.getUserId(userId),
                    role:StreamUserRole.USER
                }
            ]
        })
    }
}