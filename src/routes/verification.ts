import express from 'express';
import multer from 'multer';
import { authenticate } from '../controlers/auth';
import { shareImages, verificationReport } from '../controlers/verification';
const verificationRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


verificationRouter.post("/verification",authenticate,verificationReport);
verificationRouter.post("/shareimages",upload.array('files', 2),authenticate,shareImages);

export default verificationRouter;