const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3002;

// Add basic route for testing
app.get('/', (req, res) => {
  res.send('Chat server is running!');
});

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Store connected users
let connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user joining
  socket.on('join', (username) => {
    console.log('User joined:', username);  // Add logging
    connectedUsers.set(socket.id, username);
    io.emit('userJoined', {
      user: username,
      users: Array.from(connectedUsers.values())
    });
  });

  // Handle messages
  socket.on('message', (data) => {
    console.log('Message received:', data);  // Add logging
    const user = connectedUsers.get(socket.id);
    io.emit('message', {
      id: Date.now(),
      text: data.text,
      user: user,
      timestamp: new Date().toISOString()
    });
  });

  // Handle typing status
  socket.on('typing', (isTyping) => {
    const user = connectedUsers.get(socket.id);
    socket.broadcast.emit('userTyping', { user, isTyping });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    io.emit('userLeft', {
      user: username,
      users: Array.from(connectedUsers.values())
    });
    console.log('User disconnected:', username);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
http.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
