import express from 'express';
import { authenticate } from '../controlers/auth';
import { getlivemeetings, getOngoingMeetLink, inviteForAMeet, notifyUser, requestPrivateMeeting } from '../controlers/meeting';

const meetRouter = express.Router();

meetRouter.get("/meetings",authenticate,getlivemeetings)
meetRouter.get('/getongoingmeetlink',authenticate,getOngoingMeetLink);
meetRouter.post('/invite-for-a-meet',authenticate,inviteForAMeet);
// meetRouter.post('/getlivemeetings',authenticate,getlivemeetings);
meetRouter.post('/notifyuser',authenticate,notifyUser);
meetRouter.post('/meeting/private',authenticate,requestPrivateMeeting);

export default meetRouter;