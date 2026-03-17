import admin from 'firebase-admin';
import { serviceAccount } from './firebase-service-account';
import { MessageBody } from '../lib/utils/notification';
import { db } from '../lib/db';
import { usersTable } from '../schema';
import { eq } from 'drizzle-orm';


export const SYSTEM_NOTIFICATION_TYPE = 'system_notification';
export const CHAT_IMAGE_NOTIFICATION_TYPE = 'chat_image_notification';
export const CHAT_MESSAGE_NOTIFICATION_TYPE = 'chat_message_notification';

class NotificationService {
  private messaging!: admin.messaging.Messaging;

  public initialize(): void {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      this.messaging = admin.messaging();
      console.log('Firebase Admin initialized');
    }
  }

  public async sendNotification(
    token: string, 
    body: MessageBody, 
    type: string, 
    senderId?: string | number,
    senderName?: string,
    
  ) {

  const payload: admin.messaging.Message = {
    token,
    data: {
      type,
      ...body,
      ...(senderId && { senderId: String(senderId) }),
      ...(senderName && { senderName }),
    },
    android: { priority: 'high' },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: { sound: 'default' },
      },
    },
  };

    try {
      await this.messaging.send(payload);
    } catch (err: any) {
      console.error('Firebase notification error:', err?.errorInfo?.code || err.message);
      if(err?.errorInfo?.code === "messaging/registration-token-not-registered"){
        try {
          await db.update(usersTable).set({fcmToken:null}).where(eq(usersTable.fcmToken,token));
        } catch (error) {
          console.error('Error updating FCM token:', error);
        }
      }
    }
  }
}

export const notificationService = new NotificationService();
