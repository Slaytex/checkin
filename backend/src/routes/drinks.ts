import { Router } from 'express';
import { db } from '../database.js';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';

const router = Router();

// Check off a drink
router.post('/:date/check-off', async (req, res) => {
  try {
    const { date } = req.params;
    const { drinkId } = req.body;

    // Get the drink
    const drink = db.prepare('SELECT * FROM drinks WHERE id = ?').get(drinkId);
    if (!drink) {
      return res.status(404).json({ error: 'Drink not found' });
    }

    // Get the day
    const day = db.prepare('SELECT * FROM days WHERE id = ?').get(drink.day_id);
    if (!day) {
      return res.status(404).json({ error: 'Day not found' });
    }

    // Check off the drink
    const update = db.prepare('UPDATE drinks SET checked_off = 1 WHERE id = ?');
    update.run(drinkId);

    // Recalculate and redistribute drinks
    redistributeDrinks(date);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check off drink' });
  }
});

// Uncheck a drink
router.post('/:date/uncheck', async (req, res) => {
  try {
    const { date } = req.params;
    const { drinkId } = req.body;

    const update = db.prepare('UPDATE drinks SET checked_off = 0 WHERE id = ?');
    update.run(drinkId);

    // Recalculate and redistribute drinks
    redistributeDrinks(date);

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

    const update = db.prepare('UPDATE drinks SET drink_type = ? WHERE id = ?');
    update.run(drink_type, drinkId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update drink' });
  }
});

function redistributeDrinks(currentDate: string) {
  const date = parseISO(currentDate);
  const startOfWeekDate = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const mondayStr = format(startOfWeekDate, 'yyyy-MM-dd');
  
  // Process days from Monday to Thursday in order
  for (let i = 0; i < 4; i++) {
    const dayDate = addDays(startOfWeekDate, i);
    const dayDateStr = format(dayDate, 'yyyy-MM-dd');
    
    // Get or create the day
    let day = db.prepare('SELECT * FROM days WHERE date = ?').get(dayDateStr);
    if (!day) {
      const insert = db.prepare('INSERT INTO days (date, max_drinks, went_to_gym) VALUES (?, 2, 0)');
      insert.run(dayDateStr);
      day = db.prepare('SELECT * FROM days WHERE date = ?').get(dayDateStr);
    }
    
    const drinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? ORDER BY id ASC').all(day.id);
    const wentToGym = (day.went_to_gym as any) === 1;
    
    // Available drinks: 2 if gym, 1 if no gym
    const availableDrinks = wentToGym ? 2 : 1;
    const checkedOff = drinks.filter(d => d.checked_off === 1).length;
    
    // Only redistribute unused drinks if they went to gym
    // If gym: unused = available - checked (2 - checked)
    // If no gym: unused drinks don't move forward
    if (wentToGym) {
      const unusedDrinks = Math.max(0, availableDrinks - checkedOff);
      
      // If there are unused drinks from gym day, move them to the next day
      if (unusedDrinks > 0 && i < 3) { // Only push forward if not Thursday
        const nextDayDate = addDays(dayDate, 1);
        const nextDayDateStr = format(nextDayDate, 'yyyy-MM-dd');
        
        // Move unused drinks to next day
        pushDrinksToNextDay(dayDateStr, nextDayDateStr, unusedDrinks);
      }
    }
    // If didn't go to gym, unused drinks are lost (don't redistribute)
  }
  
  // After processing Monday-Thursday, handle any remaining drinks that need to go to weekend
  handleWeekendRedistribution(mondayStr);
}

function pushDrinksToNextDay(fromDate: string, toDate: string, count: number) {
  if (count <= 0) return;
  
  // Get target day
  let targetDay = db.prepare('SELECT * FROM days WHERE date = ?').get(toDate);
  if (!targetDay) {
    const parsedDate = parseISO(toDate);
    const dayOfWeek = parsedDate.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 4;
    const defaultMaxDrinks = isWeekday ? 2 : 0;
    const insert = db.prepare('INSERT INTO days (date, max_drinks, went_to_gym) VALUES (?, ?, 0)');
    insert.run(toDate, defaultMaxDrinks);
    targetDay = db.prepare('SELECT * FROM days WHERE date = ?').get(toDate);
  }
  
  // Get source day
  const sourceDay = db.prepare('SELECT * FROM days WHERE date = ?').get(fromDate);
  if (!sourceDay) return;
  
  // Get unchecked drinks from source day
  const uncheckedDrinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? AND checked_off = 0 ORDER BY id ASC LIMIT ?').all(sourceDay.id, count);
  
  // Delete the drinks we're moving from source day
  const deleteDrink = db.prepare('DELETE FROM drinks WHERE id = ?');
  uncheckedDrinks.forEach((drink: any) => {
    deleteDrink.run(drink.id);
  });
  
  // Get current drinks in target day
  const targetDrinks = db.prepare('SELECT COUNT(*) as count FROM drinks WHERE day_id = ?').get(targetDay.id);
  const targetCount = (targetDrinks as any).count;
  const targetMax = targetDay.max_drinks || 0;
  
  // Add all drinks to target day (we can exceed max_drinks)
  const insertDrink = db.prepare('INSERT INTO drinks (day_id, drink_type) VALUES (?, ?)');
  for (let i = 0; i < count; i++) {
    insertDrink.run(targetDay.id, 'Beer');
  }
  
  // If target day now exceeds max_drinks, push the excess forward
  const newTargetCount = targetCount + count;
  if (targetMax > 0 && newTargetCount > targetMax) {
    const excess = newTargetCount - targetMax;
    // Remove excess drinks (keeping the ones we just added, removing older ones)
    const excessDrinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? AND checked_off = 0 ORDER BY id ASC LIMIT ?').all(targetDay.id, excess);
    const deleteDrink = db.prepare('DELETE FROM drinks WHERE id = ?');
    excessDrinks.forEach((drink: any) => {
      deleteDrink.run(drink.id);
    });
    
    // Push excess to next day
    const nextDate = format(addDays(parseISO(toDate), 1), 'yyyy-MM-dd');
    pushDrinksToNextDay(toDate, nextDate, excess);
  }
}

function handleWeekendRedistribution(mondayStr: string) {
  const startOfWeekDate = parseISO(mondayStr);
  const friday = addDays(startOfWeekDate, 4);
  const saturday = addDays(startOfWeekDate, 5);
  const sunday = addDays(startOfWeekDate, 6);
  const thursdayStr = format(addDays(startOfWeekDate, 3), 'yyyy-MM-dd');
  
  // Collect all unclaimed drinks from Monday-Thursday that exceed max_drinks
  let totalExcess = 0;
  
  for (let i = 0; i < 4; i++) {
    const dayDate = addDays(startOfWeekDate, i);
    const dayDateStr = format(dayDate, 'yyyy-MM-dd');
    
    const day = db.prepare('SELECT * FROM days WHERE date = ?').get(dayDateStr);
    if (!day) continue;
    
    const drinks = db.prepare('SELECT * FROM drinks WHERE day_id = ? AND checked_off = 0').all(day.id);
    const maxDrinks = day.max_drinks || 0;
    
    // If we have more unchecked drinks than max, collect the excess
    if (drinks.length > maxDrinks) {
      const excess = drinks.length - maxDrinks;
      const excessDrinks = drinks.slice(maxDrinks);
      
      // Delete excess drinks
      const deleteDrink = db.prepare('DELETE FROM drinks WHERE id = ?');
      excessDrinks.forEach((drink: any) => {
        deleteDrink.run(drink.id);
      });
      
      totalExcess += excess;
    }
  }
  
  // Distribute excess drinks across Friday, Saturday, Sunday
  if (totalExcess > 0) {
    const weekendDays = [
      { date: format(friday, 'yyyy-MM-dd'), name: 'Friday' },
      { date: format(saturday, 'yyyy-MM-dd'), name: 'Saturday' },
      { date: format(sunday, 'yyyy-MM-dd'), name: 'Sunday' }
    ];
    
    // Split evenly, with remainder going to earlier days
    const baseAmount = Math.floor(totalExcess / 3);
    const remainder = totalExcess % 3;
    
    for (let i = 0; i < 3; i++) {
      const toAdd = baseAmount + (i < remainder ? 1 : 0);
      if (toAdd > 0) {
        const weekendDay = weekendDays[i];
        
        // Get or create the day
        let day = db.prepare('SELECT * FROM days WHERE date = ?').get(weekendDay.date);
        if (!day) {
          const insert = db.prepare('INSERT INTO days (date, max_drinks) VALUES (?, 0)');
          insert.run(weekendDay.date);
          day = db.prepare('SELECT * FROM days WHERE date = ?').get(weekendDay.date);
        }
        
        // Add drinks
        const insertDrink = db.prepare('INSERT INTO drinks (day_id, drink_type) VALUES (?, ?)');
        for (let j = 0; j < toAdd; j++) {
          insertDrink.run(day.id, 'Beer');
        }
      }
    }
  }
}

export { router as drinksRouter };

