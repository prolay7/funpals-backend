import express from "express";
import 'dotenv/config';
import cors from 'cors';
import http from 'http'
import { Server } from 'socket.io'
import authroutes from "./routes/auth";
import { checkDbConnection } from "./lib/db";
import { SocketManager } from "./socket/socket";
import meeroutes from "./routes/meet";
import userRouter from "./routes/user";
import categoryrouter from "./routes/categories";
import verificationRouter from "./routes/verification";
import chatRouter from "./routes/chat";
import searchRouter from "./routes/search";
import RedisClient from "./redis";
import reportRouter from "./routes/report";
import { notificationService } from "./firebase/notification";
import streamRouter from "./routes/streamRouter";
import scriptRouter from "./routes/script";
import groupRouter from "./routes/group";
import skillsRouter from "./routes/skills";
import issueRouter from "./routes/issue";
import MeetingQueue from "./jobs/meetingQueue";
import goalRouter from "./routes/goal";
import mediaRouter from "./routes/media";
import locationRouter from "./routes/location";
import notificationRouter from "./routes/notifications";
import activityRouter from "./routes/activity";
import materialRouter from "./routes/material";
import postRouter from "./routes/post";
import questionRouter from "./routes/question";
import eventRouter from "./routes/event";
import favoriteRouter from "./routes/favorite";
import shareRouter from "./routes/share";

const app = express();

app.use(cors());
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  },
  strict: false
}));
app.use('/api/v1', authroutes);
app.use('/api/v1',meeroutes);
app.use('/api/v1',userRouter);
app.use('/api/v1',categoryrouter);
app.use('/api/v1',verificationRouter);
app.use('/api/v1',chatRouter);
app.use('/api/v1',searchRouter);
app.use('/api/v1',reportRouter);
app.use('/api/v1',skillsRouter);
app.use('/api/v1/stream',streamRouter);
app.use('/api/v1/group',groupRouter);
app.use("/api/v1/issue",issueRouter);
app.use("/api/v1/media", mediaRouter);
app.use("/api/v1/goal", goalRouter);
app.use('/api/v1/location',locationRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/activities', activityRouter);
app.use('/api/v1/materials', materialRouter);
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/questions', questionRouter);
app.use('/api/v1/events', eventRouter);
app.use('/api/v1/favorites', favoriteRouter);
app.use('/api/v1/share', shareRouter);
app.use('/runScript',scriptRouter);


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

SocketManager.initSocket(io);
MeetingQueue.getInstance().init();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`app is running at port ${PORT}`);
  checkDbConnection();
  RedisClient.getInstance().connect(process.env.REDIS_URI!);
  notificationService.initialize();
});

app.get('/health', async(req, res) => {
  res.send("OK");
})