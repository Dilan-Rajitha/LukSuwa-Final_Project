import express from "express";
import {
    createTelemediPrescription,
    getTelemediPrescription,
} from "../controllers/telemediPrescriptionController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);

router.post("/create", createTelemediPrescription);
router.get("/:id", getTelemediPrescription);

export default router;