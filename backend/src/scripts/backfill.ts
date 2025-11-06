import { db } from '../database.js';
import { format, parseISO } from 'date-fns';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Historical data
const historicalData = [
  { date: '2025-11-01', wentToGym: true, drinks: [{ type: 'Beer', checked: true }] },
  { date: '2025-11-02', wentToGym: false, drinks: [{ type: 'Beer', checked: true }] },
  { date: '2025-11-03', wentToGym: false, drinks: [] },
  { date: '2025-11-04', wentToGym: true, drinks: [{ type: 'Beer', checked: true }] },
  { date: '2025-11-05', wentToGym: true, drinks: [] },
];

const drinkTypesPath = join(__dirname, '../../drink_types.json');
const drinkTypes = JSON.parse(readFileSync(drinkTypesPath, 'utf-8'));

for (const data of historicalData) {
  // Get or create day
  let day = db.prepare('SELECT * FROM days WHERE date = ?').get(data.date);
  if (!day) {
    const insert = db.prepare('INSERT INTO days (date, went_to_gym) VALUES (?, ?)');
    insert.run(data.date, data.wentToGym ? 1 : 0);
    day = db.prepare('SELECT * FROM days WHERE date = ?').get(data.date);
  } else {
    const update = db.prepare('UPDATE days SET went_to_gym = ? WHERE date = ?');
    update.run(data.wentToGym ? 1 : 0, data.date);
    day = db.prepare('SELECT * FROM days WHERE date = ?').get(data.date);
  }
  
  // Clear existing drinks for this day
  const deleteDrinks = db.prepare('DELETE FROM drinks WHERE day_id = ?');
  deleteDrinks.run(day.id);
  
  // Create drink slots based on available points (1 base + 1 if gym)
  const availablePoints = data.wentToGym ? 2 : 1;
  const insertDrink = db.prepare('INSERT INTO drinks (day_id, drink_type, points, checked_off) VALUES (?, ?, ?, ?)');
  
  // Create slots for all available points
  for (let i = 0; i < availablePoints; i++) {
    const drink = data.drinks[i];
    if (drink) {
      const points = drinkTypes[drink.type] || 1;
      insertDrink.run(day.id, drink.type, points, drink.checked ? 1 : 0);
    } else {
      // Create unchecked slot
      const defaultPoints = drinkTypes['Beer'] || 1;
      insertDrink.run(day.id, 'Beer', defaultPoints, 0);
    }
  }
  
  console.log(`Backfilled ${data.date}: Gym=${data.wentToGym}, Drinks=${data.drinks.length}`);
}

console.log('Backfill complete!');

