import express from 'express';
import cors from 'cors';
import http from 'http';
import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import open from 'open';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './features/auth/routes/authRoutes.js';
import profileRoutes from './features/profile/routes/profileRoutes.js';
import poolRoutes from './features/pools/routes/poolRoutes.js';
import User from './features/auth/models/user.model.js';
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
app.use('/api/profile', profileRoutes);
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
  const authToken = socket.handshake.auth?.token;
  const authorization = socket.handshake.headers?.authorization;
  const [scheme, ...headerTokenParts] =
    typeof authorization === 'string' ? authorization.trim().split(/\s+/) : [];
  const token = typeof authToken === 'string' && authToken.trim()
    ? authToken.trim()
    : scheme?.toLowerCase() === 'bearer'
      ? headerTokenParts.join(' ').trim()
      : '';

  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
      throw new Error('JWT_ACCESS_SECRET must be configured with at least 32 bytes.');
    }

    const claims = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'tous',
      audience: 'tous-client'
    });

    if (typeof claims === 'string' || typeof claims.userId !== 'string') {
      return next(new Error('Authentication error: Invalid access token'));
    }

    const user = await User.findById(claims.userId).select('_id fullName email gender role isVerified');

    if (!user || !user.isVerified) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.data.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new Error('Authentication error: Invalid or expired access token'));
    }

    console.error('[Socket Auth] Failed to authenticate connection:', error);
    return next(new Error('Authentication error: Unable to authenticate'));
  }
});

// 4. Register room WebSocket listeners on every authenticated connection
io.on('connection', (socket) => {
  // socket.on('connected',  async (rawPayload) => {
  //   socket.emit('connected')
  //     });
  console.log(`🔌 User connected: ${socket.data.user._id} (${socket.id})`);
  registerRoomHandlers(io, socket);
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`🗄️  Connected to MongoDB: ${MONGO_URI}`);

    startPoolScheduler(io, 30 * 1000);

    server.listen(PORT, () => {
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
