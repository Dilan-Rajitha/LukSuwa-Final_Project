import express from "express";
import { getDoctorAvailability, setWeeklyAvailability } from "../controllers/availabilityController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/set-weekly", verifyToken, setWeeklyAvailability);  // doctor
router.get("/doctor/:doctorId", verifyToken, getDoctorAvailability); // patient view

export default router;
