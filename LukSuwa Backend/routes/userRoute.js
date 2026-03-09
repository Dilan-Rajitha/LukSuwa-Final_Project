import express from 'express';
import { createUser, getUsers } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post("/", createUser)
userRouter.get("/", getUsers)
// userRouter.post("/send-otp", sendOTP)


export default userRouter;