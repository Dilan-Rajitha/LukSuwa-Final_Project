import { Server } from 'socket.io';

let io;

// Store active users and their socket IDs
const activeUsers = new Map();

export const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // User registers with their userId
        socket.on('register', (userId) => {
            activeUsers.set(userId, socket.id);
            console.log(`User ${userId} registered with socket ${socket.id}`);
            console.log(`Total active users: ${activeUsers.size}`);
            
            socket.emit('registered', { 
                userId, 
                socketId: socket.id,
                message: 'Successfully registered'
            });
        });

        // Get active users count
        socket.on('get-active-users', () => {
            socket.emit('active-users-count', {
                count: activeUsers.size,
                users: Array.from(activeUsers.keys())
            });
        });

        // Check if user is online
        socket.on('check-user-status', (userId) => {
            const isOnline = activeUsers.has(userId);
            socket.emit('user-status', {
                userId,
                isOnline,
                socketId: isOnline ? activeUsers.get(userId) : null
            });
        });

        // PATIENT INITIATES CALL (emits: call-user)
        socket.on('call-user', ({ callId, userToCall, signalData, from, name, callType }) => {
            const recipientSocketId = activeUsers.get(userToCall);
            
            console.log(`Call from ${from} to ${userToCall}`);
            console.log(`Recipient socket: ${recipientSocketId}`);
            console.log(`Signal data:`, signalData);
            
            if (recipientSocketId) {
                // DOCTOR RECEIVES THIS
                io.to(recipientSocketId).emit('incoming-call', {
                    callId,
                    signal: signalData, // { roomId: "...", provider: "jitsi" }
                    from,
                    name,
                    callType
                });
                
                socket.emit('call-delivered', {
                    callId,
                    to: userToCall
                });
            } else {
                console.log(`User ${userToCall} not available`);
                socket.emit('user-not-available', { 
                    userToCall,
                    message: 'User is not online'
                });
            }
        });

        // DOCTOR ACCEPTS CALL (emits: answer-call)
        socket.on('answer-call', ({ callId, signal, to }) => {
            const callerSocketId = activeUsers.get(to);
            
            console.log(`Call answered: ${callId}`);
            console.log(`Answer signal:`, signal);
            
            if (callerSocketId) {
                // PATIENT RECEIVES THIS
                io.to(callerSocketId).emit('call-accepted', {
                    callId,
                    signal // { roomId: "...", provider: "jitsi" }
                });
            }
        });

        // ICE candidate exchange (not needed for Jitsi, but keep for future)
        socket.on('ice-candidate', ({ candidate, to }) => {
            const recipientSocketId = activeUsers.get(to);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('ice-candidate', { candidate });
            }
        });

        // REJECT CALL
        socket.on('reject-call', ({ callId, to }) => {
            const callerSocketId = activeUsers.get(to);
            
            console.log(`Call rejected: ${callId}`);
            
            if (callerSocketId) {
                io.to(callerSocketId).emit('call-rejected', { 
                    callId,
                    message: 'Call was rejected'
                });
            }
        });

        // END CALL
        socket.on('end-call', ({ callId, to }) => {
            const recipientSocketId = activeUsers.get(to);
            
            console.log(`Call ended: ${callId}`);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('call-ended', { 
                    callId,
                    message: 'Call has ended'
                });
            }
        });

        // Chat message during call
        socket.on('send-message', ({ callId, to, message, senderId, senderName }) => {
            const recipientSocketId = activeUsers.get(to);
            
            console.log(`Message in call ${callId} from ${senderName}: ${message}`);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive-message', {
                    callId,
                    message,
                    senderId,
                    senderName,
                    timestamp: new Date()
                });
                
                socket.emit('message-sent', {
                    callId,
                    message,
                    timestamp: new Date()
                });
            } else {
                socket.emit('message-failed', {
                    callId,
                    message: 'Recipient is not online'
                });
            }
        });

        // Toggle video/audio
        socket.on('toggle-media', ({ to, type, enabled }) => {
            const recipientSocketId = activeUsers.get(to);
            
            console.log(`Media toggled: ${type} - ${enabled ? 'ON' : 'OFF'}`);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('media-toggled', { 
                    type, 
                    enabled 
                });
            }
        });

        // Typing indicator
        socket.on('typing', ({ callId, to }) => {
            const recipientSocketId = activeUsers.get(to);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('user-typing', { callId });
            }
        });

        // Stop typing indicator
        socket.on('stop-typing', ({ callId, to }) => {
            const recipientSocketId = activeUsers.get(to);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('user-stop-typing', { callId });
            }
        });

        // Connection quality report
        socket.on('connection-quality', ({ to, quality }) => {
            const recipientSocketId = activeUsers.get(to);
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('peer-connection-quality', { quality });
            }
        });

        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            socket.emit('socket-error', {
                message: 'An error occurred',
                error: error.message
            });
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            
            for (const [userId, socketId] of activeUsers.entries()) {
                if (socketId === socket.id) {
                    activeUsers.delete(userId);
                    console.log(`User ${userId} removed from active users`);
                    console.log(`Total active users: ${activeUsers.size}`);
                    
                    io.emit('user-offline', { userId });
                    break;
                }
            }
        });
    });

    // Periodic cleanup
    setInterval(() => {
        console.log(`Active connections: ${activeUsers.size}`);
    }, 60000);

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const getActiveUsers = () => {
    return Array.from(activeUsers.entries());
};

export const isUserOnline = (userId) => {
    return activeUsers.has(userId);
};




