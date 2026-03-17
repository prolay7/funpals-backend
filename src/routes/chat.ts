import express from "express";
import { authenticate } from "../controlers/auth";
import { getMessages, getOrCreateConversation, getUserConversations } from "../controlers/chat";

const chatRouter = express.Router();

chatRouter.get('/messages',authenticate,getMessages);
chatRouter.get('/conversation',authenticate,getOrCreateConversation);
chatRouter.get('/getUserConversations',authenticate,getUserConversations);

export default chatRouter;