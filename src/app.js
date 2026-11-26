import express from 'express';
import cors from 'cors';
import http from 'http';
import 'dotenv/config';
import mongoose from 'mongoose';
import open from 'open';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './features/auth/routes/authRoutes.js';
import poolRoutes from './features/pools/routes/poolRoutes.js';
import { swaggerSpec } from './docs/swagger.js';
import { Server } from 'socket.io';
import { registerRoomHandlers } from './features/pools/services/roomSocket.js';
import { startPoolScheduler } from './utilities/helpers/cronWorker.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tous';

// Middleware to parse incoming JSON requests
app.use(cors());
app.use(express.json({
  verify(req, res, buffer) {
    req.rawBody = Buffer.from(buffer);
  }
}));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);
app.use('/api/pools', poolRoutes);

app.get('/', (req, res) => {
  res.send('API is running with JavaScript and MongoDB!');
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Replace with your frontend URL in production
    methods: ['GET', 'POST'],
  },
});

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id || decoded.userId).select('_id name gender avatarUrl');

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// 4. Register room WebSocket listeners on every authenticated connection
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.data.user._id} (${socket.id})`);
  registerRoomHandlers(io, socket);
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`🗄️  Connected to MongoDB: ${MONGO_URI}`);

    startPoolScheduler(io, 30 * 1000);

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      const swaggerUrl = `http://localhost:${PORT}/api-docs`;
      console.log(`Swagger UI is available at ${swaggerUrl}`);
      // open(swaggerUrl).catch((error) => {
      //   console.error('Failed to open Swagger UI in a browser:', error.message);
      // });
    });
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

start();
