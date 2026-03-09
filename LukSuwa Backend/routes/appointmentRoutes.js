import express from "express";
import {
    confirmAppointment,
    createAppointment,
    getDoctorAppointments,
    getMyAppointments
} from "../controllers/appointmentController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", verifyToken, createAppointment);     // patient
router.post("/confirm", verifyToken, confirmAppointment);   // doctor (confirm/reject both)

router.get("/my", verifyToken, getMyAppointments);          // patient
router.get("/doctor/my", verifyToken, getDoctorAppointments); // doctor list

export default router;
