import express from 'express';
import symptomController from '../controllers/symptomController.js';

import { verifyToken } from '../middlewares/authMiddleware.js'; // Import the verifyToken middleware

const router = express.Router();


// router.post('/symptom-check', symptomController.checkSymptoms);

router.post('/symptom-check', verifyToken, symptomController.checkSymptoms) //with token

export default router;
