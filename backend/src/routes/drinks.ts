import { Router } from 'express';
import { db } from '../database.js';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Get drink types configuration
router.get('/types', (req, res) => {
  try {
    const drinkTypesPath = join(__dirname, '../../drink_types.json');
    const drinkTypes = JSON.parse(readFileSync(drinkTypesPath, 'utf-8'));
    res.json(drinkTypes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load drink types' });
  }
});

// Get points summary for a date
router.get('/:date/points', (req, res) => {
  try {
    const { date } = req.params;
    const pointsSummary = calculatePointsSummary(date);
    res.json(pointsSummary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate points' });
  }
});

// Get total reserve points (accumulated unused points from Mon-Thu available for Fri-Sun)
router.get('/reserve', (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri, Sat, Sun
    
    let totalReserve = 0;
    
    if (isWeekend) {
      // Calculate accumulated points from Mon-Thu
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      for (let i = 0; i < 4; i++) {
        const weekday = addDays(weekStart, i);
        const weekdayStr = format(weekday, 'yyyy-MM-dd');
        const weekdayData = db.prepare('SELECT * FROM days WHERE date = ?').get(weekdayStr);
        
        if (weekdayData) {
          // Each day gives 1 base point, +1 if gym
          const dayPoints = (weekdayData.went_to_gym as any) === 1 ? 2 : 1;
          // Check if any drinks were checked off on this day
          const drinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? AND checked_off = 1').all(weekdayData.id);
          if (drinks.length === 0) {
            // No drinks consumed, points accumulate to reserve
            totalReserve += dayPoints;
          } else {
            // Some drinks consumed, calculate unused points
            const usedPoints = drinks.reduce((sum: number, drink: any) => sum + (drink.points || 0), 0);
            const unusedPoints = dayPoints - usedPoints;
            if (unusedPoints > 0) {
              totalReserve += unusedPoints;
            }
          }
        }
      }
    }
    
    res.json({ totalReserve });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate reserve points' });
  }
});

// Check off a drink (spend points)
router.post('/:date/check-off', (req, res) => {
  try {
    const { date } = req.params;
    const { drinkId } = req.body;

    // Get the drink
    const drink = db.prepare('SELECT * FROM drinks WHERE id = ?').get(drinkId);
    if (!drink) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    // Check if user has enough points
    const pointsSummary = calculatePointsSummary(date);
    if (pointsSummary.remainingPoints < (drink.points as number)) {
      return res.status(400).json({ error: 'Not enough points' });
    }

    // Check off the drink
    const update = db.prepare('UPDATE drinks SET checked_off = 1 WHERE id = ?');
    update.run(drinkId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check off drink' });
  }
});

// Uncheck a drink (refund points)
router.post('/:date/uncheck', (req, res) => {
  try {
    const { date } = req.params;
    const { drinkId } = req.body;

    // Uncheck the drink
    const update = db.prepare('UPDATE drinks SET checked_off = 0 WHERE id = ?');
    update.run(drinkId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to uncheck drink' });
  }
});

// Update drink type
router.put('/:drinkId', (req, res) => {
  try {
    const { drinkId } = req.params;
    const { drink_type } = req.body;

    if (!drink_type) {
      return res.status(400).json({ error: 'drink_type is required' });
    }

    // Get point value for drink type
    const drinkTypesPath = join(__dirname, '../../drink_types.json');
    const drinkTypes = JSON.parse(readFileSync(drinkTypesPath, 'utf-8'));
    const points = drinkTypes[drink_type] || 1;

    const drinkIdNum = parseInt(drinkId, 10);
    if (isNaN(drinkIdNum)) {
      return res.status(400).json({ error: 'Invalid drink ID' });
    }

    const update = db.prepare('UPDATE drinks SET drink_type = ?, points = ? WHERE id = ?');
    const result = update.run(drink_type, points, drinkIdNum);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating drink:', error);
    res.status(500).json({ error: 'Failed to update drink', details: error.message });
  }
});

// Calculate points summary for a date
function calculatePointsSummary(dateStr: string) {
  const date = parseISO(dateStr);
  const day = db.prepare('SELECT * FROM days WHERE date = ?').get(dateStr);
  
  // Points earned today: 1 base point per day, +1 if went to gym (so 2 if gym, 1 if no gym)
  const earnedPoints = day ? ((day.went_to_gym as any) === 1 ? 2 : 1) : 0;
  
  // Accumulated points from Mon-Thu (always calculate, but only available on Fri-Sun)
  let accumulatedPoints = 0;
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri, Sat, Sun
  
  // Always calculate accumulated points from Mon-Thu, regardless of current day
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  for (let i = 0; i < 4; i++) {
    const weekday = addDays(weekStart, i);
    const weekdayStr = format(weekday, 'yyyy-MM-dd');
    const weekdayData = db.prepare('SELECT * FROM days WHERE date = ?').get(weekdayStr);
    
    if (weekdayData) {
      // Each day gives 1 base point, +1 if gym
      const dayPoints = (weekdayData.went_to_gym as any) === 1 ? 2 : 1;
      // Check if any drinks were checked off on this day
      const drinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? AND checked_off = 1').all(weekdayData.id);
      if (drinks.length === 0) {
        // No drinks consumed, points accumulate
        accumulatedPoints += dayPoints;
      } else {
        // Some drinks consumed, calculate unused points
        const usedPoints = drinks.reduce((sum: number, drink: any) => sum + (drink.points || 0), 0);
        const unusedPoints = dayPoints - usedPoints;
        if (unusedPoints > 0) {
          accumulatedPoints += unusedPoints;
        }
      }
    }
  }
  
  // Only add accumulated points to total available if it's Fri-Sun
  // But we still show the accumulated points value in the UI
  
  // Total available points (accumulated only counts if it's Fri-Sun)
  const totalAvailablePoints = earnedPoints + (isWeekend ? accumulatedPoints : 0);
  
  // Points used (sum of checked-off drinks)
  let usedPoints = 0;
  if (day) {
    const drinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? AND checked_off = 1').all(day.id);
    usedPoints = drinks.reduce((sum: number, drink: any) => sum + (drink.points || 0), 0);
  }
  
  // Remaining points
  const remainingPoints = totalAvailablePoints - usedPoints;
  
  return {
    earnedPoints,
    accumulatedPoints,
    totalAvailablePoints,
    usedPoints,
    remainingPoints
  };
}

export { router as drinksRouter };
