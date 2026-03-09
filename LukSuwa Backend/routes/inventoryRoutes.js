import express from "express";
import {
    deleteInventoryItem,
    importCsv,
    listInventory,
    manualCleanup,
    parseCsv,
    updateAutoDeleteSettings,
    updateAutoRefreshSettings,
    updateInventoryItem,
} from "../controllers/inventoryController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { csvUpload } from "../middlewares/csvUploadMiddleware.js";

const router = express.Router();


router.post("/parse-csv", verifyToken, csvUpload.single("file"), parseCsv);

// Import CSV data into inventory
router.post("/import-csv", verifyToken, csvUpload.single("file"), importCsv);

router.get("/", verifyToken, listInventory);

// Update single item
router.patch("/:id", verifyToken, updateInventoryItem);

// Delete single item
router.delete("/:id", verifyToken, deleteInventoryItem);

// Auto-delete settings (expired items)
router.put("/settings/auto-delete", verifyToken, updateAutoDeleteSettings);

// Auto-refresh settings (FULL clear)
router.put("/settings/auto-refresh", verifyToken, updateAutoRefreshSettings);

// Manual cleanup of expired items
router.post("/cleanup", verifyToken, manualCleanup);

export default router;