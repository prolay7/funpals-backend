import { Queue } from "bullmq";
import { MEETING_QUEUE } from "./constant";
import 'dotenv/config';
import RedisClient from "../redis";

class MeetingQueue {
  private static instance: MeetingQueue;
  private queue: Queue | null = null;

  private constructor() {}

  public static getInstance(): MeetingQueue {
    if (!MeetingQueue.instance) {
      MeetingQueue.instance = new MeetingQueue();
    }
    return MeetingQueue.instance;
  }

  public init(): void {
    if (!this.queue) {
      const redis = RedisClient.getInstance().connect(process.env.REDIS_URI!);
      this.queue = new Queue(MEETING_QUEUE, { connection: redis });
      console.log(`📦 Queue ${MEETING_QUEUE} initialized`);
    }
  }

  public getQueue(): Queue {
    if (!this.queue) throw new Error("Queue not initialized. Call init() in startup code.");
    return this.queue;
  }

  public async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      console.log(`🔴 Queue "${MEETING_QUEUE}" closed`);
    }
  }

  public async addJob(jobName: string, data: any, delayInSeconds: number = 0): Promise<void> {
    try {
      const queue = this.getQueue();
      await queue.add(jobName, data, { delay: delayInSeconds * 1000, attempts: 3 });
      console.log(`🕒 Job ${jobName} added to queue with data:`, data);
    } catch (error) {
      console.error(`❌ Failed to add job ${jobName} to queue:`, error);
    }
  }
}

export default MeetingQueue;
