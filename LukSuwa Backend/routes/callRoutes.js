import express from "express";
import {
    acceptCall, endCall,
    getAgoraToken,
    getCallDetails, getCallHistory, getCallStatistics,
    getChatMessages, initiateCall, linkPrescription, rateCall, rejectCall, saveChatMessage,
} from "../controllers/callController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";



const callRouter = express.Router();

callRouter.use(verifyToken); 

callRouter.post("/initiate", initiateCall);
callRouter.post("/accept", acceptCall);
callRouter.post("/reject", rejectCall);
callRouter.post("/end", endCall);
callRouter.get("/history", getCallHistory);
callRouter.get("/details/:callId", getCallDetails);
callRouter.post("/chat", saveChatMessage);
callRouter.get("/chat/:callId", getChatMessages);
callRouter.post("/link-prescription", linkPrescription);
callRouter.post("/rate", rateCall);
callRouter.get("/statistics", getCallStatistics);
// callRouter.get('/chat/:callId', getChatMessages);


callRouter.post("/agora-token", getAgoraToken); // new route for Agora token generation


export default callRouter;
