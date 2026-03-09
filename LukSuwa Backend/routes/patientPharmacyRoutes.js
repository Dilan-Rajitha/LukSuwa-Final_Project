import express from "express";
import {
    getAllPharmacies,
    getPharmacyInventory,
    searchMedicineInPharmacies,
} from "../controllers/patientPharmacyController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/search", verifyToken, searchMedicineInPharmacies);

router.get("/", verifyToken, getAllPharmacies);

router.get("/:pharmacyId/inventory", verifyToken, getPharmacyInventory);

export default router;