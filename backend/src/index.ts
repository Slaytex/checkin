import express from 'express';
import cors from 'cors';
import { initDatabase } from './database.js';
import { drinksRouter } from './routes/drinks.js';
import { mealsRouter } from './routes/meals.js';
import { daysRouter } from './routes/days.js';
import { cheatsRouter } from './routes/cheats.js';

const app = express();
const PORT = process.env.PORT || 3003;

// Initialize database
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/drinks', drinksRouter);
app.use('/api/meals', mealsRouter);
app.use('/api/days', daysRouter);
app.use('/api/cheats', cheatsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

