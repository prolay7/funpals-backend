import { eq } from "drizzle-orm";
import { notificationService, SYSTEM_NOTIFICATION_TYPE } from "../../firebase/notification";
import { usersTable } from "../../schema";
import { db } from "../db";


export type MessageBody = {
  title: string;
  message: string;
} & {
  [key: string]: any;
};

export const notifyToUser = async(userId:number,messageBody:MessageBody)=>{
  try {
      const [user] = await db.select({fcmToken: usersTable.fcmToken}).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if(!user || !user.fcmToken){
          console.warn(`No FCM token found for user ID ${userId}. Cannot send notification.`);
          return;
      }
      notificationService.sendNotification(
        user.fcmToken,
        messageBody,
        SYSTEM_NOTIFICATION_TYPE,
        undefined, // senderId
        undefined // senderName
      );
  } catch (error) {
      console.error('Error notifying user:', error);
  }
}