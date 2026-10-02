import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse incoming JSON requests
app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('API is running with TypeScript and ES Modules!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});