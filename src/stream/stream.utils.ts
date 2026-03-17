import {StreamChannel as StreamCallChannel} from './stream.channel'
import { StreamCallType } from "../enums/stream";
import crypto from "crypto";


export class StreamUtilities{
    public static getUserId(userId: number): string {
        return `user-${userId}`;
    }
    public static isStreamCallAvailaible():boolean{
        const isStreamCallAvailaible = Boolean(process.env.STREAM_VIDEO_CALL_AVAILAIBLE);
        return isStreamCallAvailaible;
    }
    public static getStreamApiKey():string{
        return process.env.STREAM_API_KEY || '';
    }
    public static getStreamApiSecret():string{
        return process.env.STREAM_API_SECRET || '';
    }
    public static getTokenValidityInSeconds():number{
        if(process.env.USER_TOKEN_VALIDITY_IN_SECONDS){
            return Number(process.env.USER_TOKEN_VALIDITY_IN_SECONDS);
        }
        return 3600;
    }
    public static getCallId(user_A_Id:string,user_B_Id:string):string{
        return `${user_A_Id}-${user_B_Id}-${crypto.randomUUID()}`;
    }
    public static getGroupCallId(groupId:string){
        return `${groupId}-${crypto.randomUUID()}`;
    }
    public static getMaxCallDurationInSeconds():number{
        if(process.env.MAXIMUM_CALL_DURATION){
            return Number(process.env.MAXIMUM_CALL_DURATION);
        }
        return 3600;
    }
    public static buildObjectForUser({userId,callId,isGroupCall}:{userId:number,callId:string,isGroupCall:boolean}){
        return {
            user:{
                id:StreamUtilities.getUserId(userId)
            },
            callId:callId,
            token:StreamCallChannel.generateTokenForUser(userId),
            callType:isGroupCall ? StreamCallType.GROUP : StreamCallType.DEFAULT
        }
    }
}