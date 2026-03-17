import 'dotenv/config';

export const SCHEDULED_MEETING_BUFFER_TIME = parseInt(process.env.SCHEDULED_MEETING_BUFFER_TIME || '10', 10);