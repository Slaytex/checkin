import { Router } from 'express';
import { db } from '../database.js';
import { format, parseISO, startOfWeek, addDays, isWeekend } from 'date-fns';

const router = Router();

// Get or create a day
router.get('/:date', (req, res) => {
  try {
    const { date } = req.params;
    let day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);

    if (!day) {
      // Create a new day with default max_drinks = 2 for Monday-Thursday, 0 otherwise
      const parsedDate = parseISO(date);
      const dayOfWeek = parsedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4; // Monday-Thursday
      const defaultMaxDrinks = isWeekday ? 2 : 0;
      
      const insert = db.prepare('INSERT INTO days (date, max_drinks, went_to_gym) VALUES (?, ?, 0)');
      const result = insert.run(date, defaultMaxDrinks);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    }

    // Get drinks for this day
    const drinks = db.prepare('SELECT * FROM drinks WHERE day_id = ?').all(day.id);
    const meals = db.prepare('SELECT * FROM meals WHERE day_id = ?').all(day.id);

    res.json({
      ...day,
      drinks,
      meals
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get day' });
  }
});

// Update max drinks for a day
router.put('/:date/max-drinks', (req, res) => {
  try {
    const { date } = req.params;
    const { max_drinks } = req.body;

    // Get or create day
    let day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    if (!day) {
      const insert = db.prepare('INSERT INTO days (date, max_drinks) VALUES (?, ?)');
      insert.run(date, max_drinks);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    } else {
      const update = db.prepare('UPDATE days SET max_drinks = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?');
      update.run(max_drinks, date);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    }

    // Update drinks for this day
    const existingDrinks = db.prepare('SELECT * FROM drinks WHERE day_id = ?').all(day.id);
    const currentCount = existingDrinks.length;
    
    if (max_drinks > currentCount) {
      // Add new drinks
      const insertDrink = db.prepare('INSERT INTO drinks (day_id, drink_type) VALUES (?, ?)');
      for (let i = currentCount; i < max_drinks; i++) {
        insertDrink.run(day.id, 'Beer'); // Default drink type
      }
    } else if (max_drinks < currentCount) {
      // Remove extra drinks (remove unchecked ones first)
      const uncheckedDrinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? AND checked_off = 0 ORDER BY id DESC LIMIT ?').all(day.id, currentCount - max_drinks);
      const deleteDrink = db.prepare('DELETE FROM drinks WHERE id = ?');
      uncheckedDrinks.forEach(drink => {
        deleteDrink.run(drink.id);
      });
    }

    res.json(day);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update max drinks' });
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
      const parsedDate = parseISO(date);
      const dayOfWeek = parsedDate.getDay();
      const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4;
      const defaultMaxDrinks = isWeekday ? 2 : 0;
      
      const insert = db.prepare('INSERT INTO days (date, max_drinks, went_to_gym) VALUES (?, ?, ?)');
      insert.run(date, defaultMaxDrinks, went_to_gym ? 1 : 0);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    } else {
      const update = db.prepare('UPDATE days SET went_to_gym = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?');
      update.run(went_to_gym ? 1 : 0, date);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    }
    
    // Update drinks based on gym status
    // Gym = 2 drinks available, No gym = 1 drink available
    const availableDrinks = went_to_gym ? 2 : 1;
    const existingDrinks = db.prepare('SELECT * FROM drinks WHERE day_id = ?').all(day.id);
    const currentCount = existingDrinks.length;
    
    if (availableDrinks > currentCount) {
      // Add new drinks
      const insertDrink = db.prepare('INSERT INTO drinks (day_id, drink_type) VALUES (?, ?)');
      for (let i = currentCount; i < availableDrinks; i++) {
        insertDrink.run(day.id, 'Beer');
      }
    } else if (availableDrinks < currentCount) {
      // Remove extra drinks (remove unchecked ones first)
      const uncheckedDrinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? AND checked_off = 0 ORDER BY id DESC LIMIT ?').all(day.id, currentCount - availableDrinks);
      const deleteDrink = db.prepare('DELETE FROM drinks WHERE id = ?');
      uncheckedDrinks.forEach(drink => {
        deleteDrink.run(drink.id);
      });
    }

    res.json(day);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update gym status' });
  }
});

// Get today's date
router.get('/today', (req, res) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  res.json({ date: today });
});

export { router as daysRouter };

