import { Router } from 'express';
import { db } from '../database.js';
import { format, parseISO, startOfWeek, addDays, getYear, getMonth } from 'date-fns';

const router = Router();

// Get current week cheat count
router.get('/current', (req, res) => {
  try {
    const today = new Date();
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
    
    const cheats = db.prepare(`
      SELECT COUNT(*) as count 
      FROM cheats 
      WHERE date >= ? AND date <= ?
    `).get(weekStart, weekEnd);
    
    const count = (cheats as any).count || 0;
    res.json({ count, max: 3 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cheat count' });
  }
});

// Get good days count (days where you went to gym but had 0 drinks)
router.get('/good-days/current', (req, res) => {
  try {
    const today = new Date();
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
    
    const days = db.prepare(`
      SELECT d.*, 
             (SELECT COUNT(*) FROM drinks WHERE day_id = d.id AND checked_off = 1) as checked_count
      FROM days d
      WHERE d.date >= ? AND d.date <= ?
    `).all(weekStart, weekEnd);
    
    let goodDays = 0;
    for (const day of days) {
      const wentToGym = (day.went_to_gym as any) === 1;
      const checkedCount = (day as any).checked_count || 0;
      
      if (wentToGym && checkedCount === 0) {
        goodDays++;
      }
    }
    
    res.json({ goodDays });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get good days count' });
  }
});

// Record a cheat
router.post('/:date', (req, res) => {
  try {
    const { date } = req.params;
    const { drink_type } = req.body;
    
    if (!drink_type) {
      return res.status(400).json({ error: 'drink_type is required' });
    }
    
    // Check current week cheat count
    const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd');
    
    const currentCheats = db.prepare(`
      SELECT COUNT(*) as count 
      FROM cheats 
      WHERE date >= ? AND date <= ?
    `).get(weekStart, weekEnd);
    
    const currentCount = (currentCheats as any).count || 0;
    
    if (currentCount >= 3) {
      return res.status(400).json({ error: 'Maximum cheats (3) already reached for this week' });
    }
    
    // Record the cheat
    const insert = db.prepare('INSERT INTO cheats (date, drink_type) VALUES (?, ?)');
    insert.run(date, drink_type);
    
    const newCheats = db.prepare(`
      SELECT COUNT(*) as count 
      FROM cheats 
      WHERE date >= ? AND date <= ?
    `).get(weekStart, weekEnd);
    
    const newCount = (newCheats as any).count || 0;
    
    res.json({ count: newCount, max: 3 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record cheat' });
  }
});

// Get monthly stats
router.get('/monthly/:year/:month', (req, res) => {
  try {
    const { year, month } = req.params;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1; // JavaScript months are 0-indexed
    
    // Get first and last day of month
    const firstDay = new Date(yearNum, monthNum, 1);
    const lastDay = new Date(yearNum, monthNum + 1, 0);
    const firstDayStr = format(firstDay, 'yyyy-MM-dd');
    const lastDayStr = format(lastDay, 'yyyy-MM-dd');
    
    // Total drink points (sum of points from checked-off drinks)
    const totalDrinkPoints = db.prepare(`
      SELECT COALESCE(SUM(d.points), 0) as total
      FROM drinks d
      JOIN days day ON d.day_id = day.id
      WHERE day.date >= ? AND day.date <= ? AND d.checked_off = 1
    `).get(firstDayStr, lastDayStr);
    
    // Total gym visits
    const totalGymVisits = db.prepare(`
      SELECT COUNT(*) as count
      FROM days
      WHERE date >= ? AND date <= ? AND went_to_gym = 1
    `).get(firstDayStr, lastDayStr);
    
    res.json({
      totalDrinkPoints: (totalDrinkPoints as any).total || 0,
      totalGymVisits: (totalGymVisits as any).count || 0,
      year: yearNum,
      month: monthNum + 1
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monthly stats' });
  }
});

export { router as cheatsRouter };
