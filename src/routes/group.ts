import express from 'express';
import {
  createGroup,
  addUserToGroup,
  getGroupMessagesPaginated,
  getGroups,
  getGroupDetails,
  getGroupLiveMeetings,
  scheduleMeeting,
  joinGroupCall,
  startInstantCall,
  handleSelfAction,
  updateGroupDetails
} from '../controlers/group';
import { authenticate } from '../controlers/auth';
import multer from 'multer';

const groupRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


// Get group details
groupRouter.get('/get-group/:groupId', authenticate, getGroupDetails);

// Create a new group
groupRouter.post('/create', authenticate, createGroup);

// Add a user to a group,it will be used by admin later
groupRouter.post('/add-user', authenticate, addUserToGroup);

//Join/leave group
groupRouter.post('/join-leave', authenticate, handleSelfAction);

//update group details
groupRouter.patch('/update/:groupId',upload.single('file'), authenticate, updateGroupDetails);

// Get paginated group messages
groupRouter.get('/messages/:groupId', authenticate, getGroupMessagesPaginated);

// Get groups (query param: isAlreadyMember)
groupRouter.get('/user', authenticate, getGroups);

// Get live meetings for a group
groupRouter.get("/live-meetings/:groupId", authenticate, getGroupLiveMeetings);

//schedule a meeting
groupRouter.post('/schedule-meeting', authenticate, scheduleMeeting);

//join a group call
groupRouter.patch('/join-call', authenticate, joinGroupCall);

//start instant call
groupRouter.post('/start-instant-call', authenticate, startInstantCall);

export default groupRouter;