import { Router } from 'express';
import { db } from '../database.js';
import { format, parseISO } from 'date-fns';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Get today's date (must come before /:date route)
router.get('/today', (req, res) => {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    res.json({ date: today });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get today\'s date' });
  }
});

// Get or create a day
router.get('/:date', (req, res) => {
  try {
    const { date } = req.params;
    let day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);

    if (!day) {
      // Create a new day
      const insert = db.prepare('INSERT INTO days (date, went_to_gym) VALUES (?, 0)');
      insert.run(date);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    }

    // Ensure drink slots exist based on available points
    // 1 base point per day, +1 if gym (so 2 if gym, 1 if no gym)
    const availablePoints = (day.went_to_gym as any) === 1 ? 2 : 1;
    const existingDrinks = db.prepare('SELECT * FROM drinks WHERE day_id = ?').all(day.id);
    
    if (existingDrinks.length === 0) {
      // Create drink slots
      const drinkTypesPath = join(__dirname, '../../drink_types.json');
      const drinkTypes = JSON.parse(readFileSync(drinkTypesPath, 'utf-8'));
      const defaultPoints = drinkTypes['Beer'] || 1;
      
      const insertDrink = db.prepare('INSERT INTO drinks (day_id, drink_type, points) VALUES (?, ?, ?)');
      for (let i = 0; i < availablePoints; i++) {
        insertDrink.run(day.id, 'Beer', defaultPoints);
      }
    }

    // Get drinks for this day
    const drinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? ORDER BY id ASC').all(day.id);

    res.json({
      ...day,
      drinks
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get day' });
  }
});

// Update gym status for a day
router.put('/:date/gym', (req, res) => {
  try {
    const { date } = req.params;
    const { went_to_gym } = req.body;

    // Get or create day
    let day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    if (!day) {
      const insert = db.prepare('INSERT INTO days (date, went_to_gym) VALUES (?, ?)');
      insert.run(date, went_to_gym ? 1 : 0);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    } else {
      const update = db.prepare('UPDATE days SET went_to_gym = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?');
      update.run(went_to_gym ? 1 : 0, date);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    }
    
    // Create drink slots based on available points
    // 1 base point per day, +1 if gym (so 2 if gym, 1 if no gym)
    const availablePoints = went_to_gym ? 2 : 1;
    const existingDrinks = db.prepare('SELECT * FROM drinks WHERE day_id = ?').all(day.id);
    const checkedDrinks = existingDrinks.filter((d: any) => d.checked_off === 1);
    const uncheckedDrinks = existingDrinks.filter((d: any) => d.checked_off === 0);
    
    // Load drink types to get default point values
    const drinkTypesPath = join(__dirname, '../../drink_types.json');
    const drinkTypes = JSON.parse(readFileSync(drinkTypesPath, 'utf-8'));
    const defaultPoints = drinkTypes['Beer'] || 1;
    
    // Calculate how many drink slots we need
    // We want enough slots to use all available points (assuming 1 point drinks)
    const neededSlots = availablePoints;
    const currentTotalCount = existingDrinks.length;
    const currentUncheckedCount = uncheckedDrinks.length;
    
    if (neededSlots > currentTotalCount) {
      // Add more drink slots
      const insertDrink = db.prepare('INSERT INTO drinks (day_id, drink_type, points) VALUES (?, ?, ?)');
      for (let i = currentTotalCount; i < neededSlots; i++) {
        insertDrink.run(day.id, 'Beer', defaultPoints);
      }
    } else if (neededSlots < currentTotalCount) {
      // Remove extra unchecked drinks (keep checked ones)
      const toRemove = currentTotalCount - neededSlots;
      const deleteDrink = db.prepare('DELETE FROM drinks WHERE id = ?');
      uncheckedDrinks.slice(0, toRemove).forEach((drink: any) => {
        deleteDrink.run(drink.id);
      });
    }

    res.json(day);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update gym status' });
  }
});

export { router as daysRouter };
