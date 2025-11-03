import { Router } from 'express';
import { db } from '../database.js';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';

const router = Router();

// Get cheat count for current week
router.get('/week/:weekStart', (req, res) => {
  try {
    const { weekStart } = req.params;
    const cheats = db.prepare('SELECT COUNT(*) as count FROM cheat_log WHERE week_start = ?').get(weekStart);
    const count = (cheats as any).count || 0;
    res.json({ count, max: 3 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cheat count' });
  }
});

// Get current week cheat count
router.get('/current', (req, res) => {
  try {
    const today = new Date();
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const cheats = db.prepare('SELECT COUNT(*) as count FROM cheat_log WHERE week_start = ?').get(weekStart);
    const count = (cheats as any).count || 0;
    res.json({ count, max: 3, weekStart });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cheat count' });
  }
});

// Record a cheat
router.post('/:date', (req, res) => {
  try {
    const { date } = req.params;
    const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    // Check current week cheat count
    const currentCheats = db.prepare('SELECT COUNT(*) as count FROM cheat_log WHERE week_start = ?').get(weekStart);
    const currentCount = (currentCheats as any).count || 0;
    
    if (currentCount >= 3) {
      return res.status(400).json({ error: 'Maximum cheats (3) already reached for this week' });
    }
    
    // Record the cheat
    const insert = db.prepare('INSERT INTO cheat_log (date, week_start) VALUES (?, ?)');
    insert.run(date, weekStart);
    
    const newCheats = db.prepare('SELECT COUNT(*) as count FROM cheat_log WHERE week_start = ?').get(weekStart);
    const newCount = (newCheats as any).count || 0;
    
    res.json({ count: newCount, max: 3 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record cheat' });
  }
});

// Get good days count (days where you drank less than allowance) for current week
// This helps reduce the red background brightness
router.get('/good-days/current', (req, res) => {
  try {
    const today = new Date();
    const weekStartDate = startOfWeek(today, { weekStartsOn: 1 });
    const weekStart = format(weekStartDate, 'yyyy-MM-dd');
    const weekEnd = format(addDays(weekStartDate, 6), 'yyyy-MM-dd');
    
    // Get all days in the week
    const days = db.prepare(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM drinks WHERE day_id = d.id AND checked_off = 1) as checked_count
      FROM days d
      WHERE d.date >= ? AND d.date <= ?
    `).all(weekStart, weekEnd);
    
    let goodDays = 0;
    for (const day of days) {
      const checkedCount = (day as any).checked_count || 0;
      const wentToGym = (day.went_to_gym as any) === 1;
      const availableDrinks = wentToGym ? 2 : 1;
      
      // Good day = drank less than available
      if (checkedCount < availableDrinks) {
        goodDays++;
      }
    }
    
    res.json({ goodDays, totalDays: Math.min(7, days.length) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get good days count' });
  }
});

export { router as cheatsRouter };

