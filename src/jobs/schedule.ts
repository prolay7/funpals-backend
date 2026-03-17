import { Worker } from "bullmq";
import { MEETING_QUEUE, MEETING_REMINDER_JOB } from "./constant";
import 'dotenv/config';
import RedisClient from "../redis";
import { JobConsumer } from "./jobConsumer";

class Scheduler {
  private static instance: Scheduler;
  private worker: Worker | null = null;

  private constructor() {}

  public static getInstance(): Scheduler {
    if (!Scheduler.instance) {
      Scheduler.instance = new Scheduler();
    }
    return Scheduler.instance;
  }

  public init(): void {
    if (this.worker) {
      console.log("⚠️ Scheduler already initialized.");
      return;
    }

    const redis = RedisClient.getInstance().connect(process.env.REDIS_URI!);

    this.worker = new Worker(
      MEETING_QUEUE,
      async (job) => {
        if (job.name === MEETING_REMINDER_JOB) {
          const { meetingId } = job.data;
          JobConsumer.handleMeetingReminder(meetingId);
        }
      },
      { connection: redis }
    );

    this.worker.on("ready", () => {
      console.log("👷 Worker is ready and listening for jobs...");
    });

    this.worker.on("completed", (job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`❌ Job ${job?.id} failed after ${job?.attemptsMade} attempts: ${err.message}`);
    });

    this.worker.on("closed", () => {
      console.log("🔴 Worker connection closed.");
    });

    this.worker.on("error", (err) => {
      console.error("❌ Worker error:", err);
    });
  }

  public async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      console.log("🔴 Worker closed");
    }
  }
}

export default Scheduler;
