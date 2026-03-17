import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { groupMeetingsTable, groupMembersTable } from "../schema";
import { StreamChannel } from "../stream/stream.channel";
import { notifyToUser } from "../lib/utils/notification";
import { SCHEDULED_MEETING_BUFFER_TIME } from "../constants";


export class JobConsumer{
    public static async handleMeetingReminder(meetingId:number){
      try {
        if(!meetingId) return;
        console.log(`🔔 Handling meeting reminder for meeting ID: ${meetingId}`);
        const [scheduledMeeting] = await db.select().from(groupMeetingsTable).where(eq(groupMeetingsTable.id, meetingId)).limit(1);
        if(!scheduledMeeting) return;
        const start =  scheduledMeeting.meetingStartTime;
        const end = scheduledMeeting.meetingEndTime;
        let durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
        durationSeconds += SCHEDULED_MEETING_BUFFER_TIME * 60;
        const streamCallId = await StreamChannel.createGroupCall(scheduledMeeting.id, scheduledMeeting.createdBy, durationSeconds);
        await db.update(groupMeetingsTable)
          .set({ streamCallId })
          .where(eq(groupMeetingsTable.id, meetingId));
        const groupMembers = await db.select().from(groupMembersTable).where(eq(groupMembersTable.groupId, scheduledMeeting.groupId));
        const message = `${scheduledMeeting.meetTitle} is starting in 15 minutes`;
        const messageBody = {
            title: `Meeting Reminder`,
            message
        }
        await Promise.all(
            groupMembers.map(member => 
            notifyToUser(member.userId, messageBody)
            )
        );
      } catch (error) {
        console.error(`❌ Error handling meeting reminder for meeting ID ${meetingId}:`, error);
      }
    }
}