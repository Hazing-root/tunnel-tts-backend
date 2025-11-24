require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const app = express();
const server = http.createServer(app);

// Rate limiter: 1 request per 5 s per IP
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

// CORS
const corsOptions = {
  origin: (origin, cb) => (!origin ? cb(null, true) : cb(null, true)),
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// Rate-limit middleware
const rateLimitMiddleware = async (req, res, next) => {
  try { await rateLimiter.consume(req.ip); next(); }
  catch { res.status(429).json({ error: 'Cooldown active' }); }
};

// Socket.IO
const io = socketIo(server, { cors: corsOptions, transports: ['websocket', 'polling'] });

// Socket auth
io.use((socket, next) => {
  if (socket.handshake.query.key === process.env.SPEECH_KEY) return next();
  next(new Error('Authentication failed'));
});

const connectedClients = new Map();

io.on('connection', (socket) => {
  const type = socket.handshake.query.type || 'browser';
  connectedClients.set(socket.id, { type, socket });
  console.log(`Client ${socket.id} (${type}) connected – total: ${connectedClients.size}`);

  socket.on('speak', async (data) => {
    if (type !== 'browser') return;
    try {
      await rateLimiter.consume(socket.handshake.address);
      let text = (data.text || '').substring(0, 100);
      if (!text.trim()) return socket.emit('error', { message: 'Empty text' });

      const pcClients = Array.from(connectedClients.values()).filter(c => c.type === 'pc');
      if (!pcClients.length) return socket.emit('error', { message: 'No PC client connected' });

      pcClients.forEach(c => c.socket.emit('speak', { text }));
      socket.emit('success', { message: 'Text sent for speech' });
    } catch {
      socket.emit('error', { message: 'Rate limit exceeded. Please wait 5 seconds.' });
    }
  });

  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    console.log(`Client ${socket.id} disconnected – total: ${connectedClients.size}`);
  });
});

// HTTP health check
app.get('/health', (req, res) => res.json({ status: 'ok', clients: connectedClients.size }));

// HTTP speak endpoint (also rate-limited)
app.post('/speak', rateLimitMiddleware, (req, res) => {
  const text = (req.body.text || '').substring(0, 100);
  if (!text.trim()) return res.status(400).json({ error: 'Text required' });

  const pcClients = Array.from(connectedClients.values()).filter(c => c.type === 'pc');
  if (!pcClients.length) return res.status(503).json({ error: 'No PC client connected' });

  pcClients.forEach(c => c.socket.emit('speak', { text }));
  res.json({ success: true, message: 'Text sent for speech' });
});

// Root route – no static files
app.get('/', (req, res) => res.send('Tunnel-TTS API ready – use POST /speak or WebSocket'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Waiting for connections…');
});