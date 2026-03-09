import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import aiRouter from './routes/aiRouter.js';
import loginRouter from './routes/loginRouter.js';
import ocrRoutes from './routes/ocrRoutes.js';
import prescriptionRoutes from "./routes/prescriptionRoutes.js";
import superUserRouter from './routes/superUserRouter.js';
import symptomRoute from './routes/symptomRoute.js';
import userRouter from './routes/userRoute.js';

import { initializeSocket } from './socket/socketHandler.js';

//new
import appointmentRoutes from "./routes/appointmentRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import callRoutes from "./routes/callRoutes.js";

import inventoryRoutes from "./routes/inventoryRoutes.js";

import patientPharmacyRoutes from './routes/patientPharmacyRoutes.js';

import notificationRoutes from "./routes/notificationRoutes.js";

import healthTipRouter from "./routes/healthTipRouter.js";

import telemediPrescriptionRoutes from "./routes/telemediPrescriptionRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Verify environment variables
if (!process.env.JWT_SECRET) {
    console.error('[ERROR] JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

if (!process.env.MONGODB_URL) {
    console.error('[ERROR] MONGODB_URL is not defined in environment variables');
    process.exit(1);
}

console.log('[INFO] Environment variables loaded successfully');

const app = express();

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocket(server);
console.log('[INFO] Socket.io initialized successfully');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('[INFO] Static uploads folder enabled:', path.join(__dirname, 'uploads'));

// JWT Authentication Middleware
app.use((req, res, next) => {
    const tokenString = req.header("Authorization");

    if (tokenString != null) {
        const token = tokenString.replace("Bearer ", "");

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.log('[WARN] JWT verification failed:', err.message);
                req.user = null;
                next();
            } else {
                req.user = decoded;
                next();
            }
        });
    } else {
        req.user = null;
        next();
    }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URL)
    .then(() => {
        console.log('[SUCCESS] Connected to MongoDB');
        console.log('[INFO] Database:', mongoose.connection.name);
    })
    .catch((err) => {
        console.error('[ERROR] Failed to connect to MongoDB:', err.message);
        process.exit(1);
    });

// Health check route
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'LukSuwa Backend API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            users: '/api/users',
            superusers: '/api/superusers',
            login: '/api/login',
            ai: '/api/ai',
            symptoms: '/api/ai/symptom-check',
            ocr: '/api/ocr',
            prescriptions: '/api/prescriptions',
            calls: '/api/calls',
            uploads: '/uploads' 
        }
    });
});

// API Routes
app.use('/api/users', userRouter);
app.use('/api/superusers', superUserRouter);
app.use('/api/login', loginRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai', symptomRoute);
app.use('/api/ocr', ocrRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
// app.use('/api/calls', callRouter);


//new
app.use("/api/availability", availabilityRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/calls", callRoutes);

app.use("/api/inventory", inventoryRoutes);

app.use('/api/patient/pharmacies', patientPharmacyRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/health-tips", healthTipRouter);


// medicine prescription for telemedicine
// serve uploads
// app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// // routes
// app.use("/telemediPrescription", telemediPrescriptionRoutes);
// telemedicine prescription for calls
app.use("/api/telemediPrescription", telemediPrescriptionRoutes);

// 404 handler
app.use((req, res) => {
    console.log('[WARN] 404 - Endpoint not found:', req.method, req.path);
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[ERROR] Internal server error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log('========================================');
    console.log('[SUCCESS] Server started successfully');
    console.log('[INFO] Server running on port:', PORT);
    console.log('[INFO] Socket.io ready for connections');
    console.log('[INFO] Environment:', process.env.NODE_ENV || 'development');
    console.log('[INFO] Local URL: http://localhost:' + PORT);
    console.log('[INFO] Uploads URL: http://localhost:' + PORT + '/uploads');
    console.log('========================================');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[INFO] Shutting down gracefully...');
    
    try {
        await mongoose.connection.close();
        console.log('[SUCCESS] MongoDB connection closed');
        
        server.close(() => {
            console.log('[SUCCESS] Server closed');
            process.exit(0);
        });
    } catch (error) {
        console.error('[ERROR] Error during shutdown:', error);
        process.exit(1);
    }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('[ERROR] Unhandled Promise Rejection:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('[ERROR] Uncaught Exception:', err);
    process.exit(1);
});

export default app;