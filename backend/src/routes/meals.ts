import { Router } from 'express';
import { db } from '../database.js';

const router = Router();

// Get meals for a day
router.get('/:date', (req, res) => {
  try {
    const { date } = req.params;
    const day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    
    if (!day) {
      return res.json([]);
    }
    
    const meals = db.prepare('SELECT * FROM meals WHERE day_id = ?').all(day.id);
    res.json(meals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get meals' });
  }
});

// Add a meal
router.post('/:date', (req, res) => {
  try {
    const { date } = req.params;
    const { meal_type, meal_name } = req.body;
    
    // Get or create day
    let day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    if (!day) {
      const insert = db.prepare('INSERT INTO days (date, max_drinks) VALUES (?, 0)');
      insert.run(date);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(date);
    }
    
    const insert = db.prepare('INSERT INTO meals (day_id, meal_type, meal_name) VALUES (?, ?, ?)');
    const result = insert.run(day.id, meal_type, meal_name);
    
    const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid);
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add meal' });
  }
});

// Update a meal
router.put('/:mealId', (req, res) => {
  try {
    const { mealId } = req.params;
    const { meal_type, meal_name } = req.body;
    
    const update = db.prepare('UPDATE meals SET meal_type = ?, meal_name = ? WHERE id = ?');
    update.run(meal_type, meal_name, mealId);
    
    const meal = db.prepare('SELECT * FROM meals WHERE id = ?').get(mealId);
    res.json(meal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

// Delete a meal
router.delete('/:mealId', (req, res) => {
  try {
    const { mealId } = req.params;
    const deleteMeal = db.prepare('DELETE FROM meals WHERE id = ?');
    deleteMeal.run(mealId);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

export { router as mealsRouter };

