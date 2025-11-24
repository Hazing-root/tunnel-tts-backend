
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Rate limiter: 1 request per 5 seconds per IP
const rateLimiter = new RateLimiterMemory({
  keyPrefix: 'middleware',
  points: 1,
  duration: 5,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// CORS configuration - allow only tunnel origin
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, you might want to check if origin matches your tunnel URL
    callback(null, true);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting middleware
const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({ error: 'Cooldown active' });
  }
};

// Socket.IO setup
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const key = socket.handshake.query.key;
  if (key === process.env.SPEECH_KEY) {
    next();
  } else {
    next(new Error('Authentication failed'));
  }
});

// Store connected clients
const connectedClients = new Map();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Identify client type
  const clientType = socket.handshake.query.type || 'browser';
  connectedClients.set(socket.id, { type: clientType, socket });
  
  console.log(`Client type: ${clientType}`);
  console.log(`Total connected clients: ${connectedClients.size}`);

  // Handle text-to-speech requests from browser
  socket.on('speak', async (data) => {
    if (clientType === 'browser') {
      // Rate limit check for browser clients
      try {
        await rateLimiter.consume(socket.handshake.address);
        
        // Validate and truncate message
        let text = data.text || '';
        if (text.length > 100) {
          text = text.substring(0, 100);
        }
        
        if (text.trim()) {
          // Send to all PC clients for TTS
          const pcClients = Array.from(connectedClients.values())
            .filter(client => client.type === 'pc');
          
          if (pcClients.length > 0) {
            pcClients.forEach(client => {
              client.socket.emit('speak', { text });
            });
            socket.emit('success', { message: 'Text sent for speech' });
          } else {
            socket.emit('error', { message: 'No PC client connected' });
          }
        } else {
          socket.emit('error', { message: 'Empty text' });
        }
      } catch (rejRes) {
        socket.emit('error', { message: 'Rate limit exceeded. Please wait 5 seconds.' });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    connectedClients.delete(socket.id);
  });
});

// HTTP endpoint for health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', clients: connectedClients.size });
});

// Apply rate limiting to the speak endpoint
app.post('/speak', rateLimitMiddleware, (req, res) => {
  const { text } = req.body;
  
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  // Truncate if too long
  const truncatedText = text.length > 100 ? text.substring(0, 100) : text;
  
  // Send to all PC clients
  const pcClients = Array.from(connectedClients.values())
    .filter(client => client.type === 'pc');
  
  if (pcClients.length > 0) {
    pcClients.forEach(client => {
      client.socket.emit('speak', { text: truncatedText });
    });
    res.json({ success: true, message: 'Text sent for speech' });
  } else {
    res.status(503).json({ error: 'No PC client connected' });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Waiting for connections...');
  console.log('Make sure to set SPEECH_KEY in your .env file');
});