import express from 'express';
import {
  approveSuperUser,
  createSuperUser,
  getDoctors,
  getPendingSuperUsers,
  getPharmacies,
  getSuperUsers,
  rejectSuperUser
} from '../controllers/superUserController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';


// new add with location part 2025/12/23
import { updateMyPharmacyProfile } from "../controllers/superUserController.js";


const superUserRouter = express.Router();

// Middleware to handle both field names for file upload
const handleFileUpload = (req, res, next) => {
  const uploadHandler = upload.single('certificate_image');
  
  uploadHandler(req, res, (err) => {
    if (err && err.field === 'certificate') {
      const altUploadHandler = upload.single('certificate');
      return altUploadHandler(req, res, next);
    }
    
    if (err) {
      return res.status(400).json({
        message: 'File upload error',
        error: err.message
      });
    }
    
    next();
  });
};

// Public route - Register as SuperUser (doctor/pharmacy)
superUserRouter.post('/', handleFileUpload, createSuperUser);

// Admin-only routes (MUST send Authorization: Bearer <token>)
superUserRouter.get('/pending', verifyToken, getPendingSuperUsers);
superUserRouter.get('/', verifyToken, getSuperUsers);
superUserRouter.patch('/:id/approve', verifyToken, approveSuperUser);
superUserRouter.patch('/:id/reject', verifyToken, rejectSuperUser);


// Public: Approved doctors list
superUserRouter.get("/doctors", getDoctors);

// Public: Approved pharmacies list
superUserRouter.get("/pharmacies", getPharmacies);


// new add with location part 2025/12/23
// Pharmacy: set location (must be logged in + approved)
superUserRouter.patch("/me/profile", verifyToken, updateMyPharmacyProfile);



export default superUserRouter;
