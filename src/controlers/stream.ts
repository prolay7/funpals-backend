import { StreamCallType } from "../enums/stream";
import { addUserToCallFromChannelId, callEnded, callStarted, removeUserFromCallFromChannelId } from "./meeting";

export const captureWebhook = async(event: any) => {
    try {
        const eventType = event?.type;
        const [channel_type,channel_id] = event?.call_cid?.split(':');
        console.log('Channel Type:', channel_type, 'Channel ID:', channel_id);
        if(channel_type === StreamCallType.GROUP){
            console.log('Group call webhook received');
            //handle group call webhooks later
            return;
        }
        switch (eventType) {
            case "call.session_participant_joined":
                await addUserToCallFromChannelId(channel_id);
                break;
            case "call.session_participant_left":
                await removeUserFromCallFromChannelId(channel_id);
                break;
            case "call.session_ended":
                await callEnded(channel_id);
                break;
            case "call.session_started":
                await callStarted(channel_id);
                break;    
        }
    } catch (error) {
        console.log('Error while capturing stream webhook', error);
        throw new Error('Something went wrong 49');
    }
};