import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import mongoose from 'mongoose';
import open from 'open';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './features/auth/routes/authRoutes.js';
import { swaggerSpec } from './docs/swagger.js';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tous';

// Middleware to parse incoming JSON requests
app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('API is running with JavaScript and MongoDB!');
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`🗄️  Connected to MongoDB: ${MONGO_URI}`);

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
