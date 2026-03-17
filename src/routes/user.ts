import express from 'express';
import { authenticate } from '../controlers/auth';
import { dislikeUser, getAllOnlineUsers, getOtherCommonUsers, getUserLikedUsers, getUserProfile, getUserUpcomingMeetings, init, likeUser, updateDetails, updateFcmToken, updateProfilePhoto } from '../controlers/user';
import { getUserLikedCategories } from '../controlers/categories';
import multer from 'multer';


const userRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

userRouter.get("/user-details",authenticate,init);
userRouter.get("/user-liked-categories",authenticate,getUserLikedCategories);
userRouter.post("/user/like",authenticate,likeUser);
userRouter.delete("/user/like",authenticate,dislikeUser);
userRouter.get("/get-user-likedUsers",authenticate,getUserLikedUsers);
userRouter.put("/update-details",authenticate,updateDetails);
userRouter.put("/update-profile-photo",upload.single('file'),authenticate,updateProfilePhoto);
userRouter.post("/update-fcm-token",authenticate,updateFcmToken);
userRouter.get("/get-other-common-users",authenticate,getOtherCommonUsers);
userRouter.get('/user-profile/:userId',authenticate,getUserProfile);
userRouter.get("/user-calendar",authenticate,getUserUpcomingMeetings);
userRouter.get("/users",authenticate,getAllOnlineUsers);

export default userRouter;