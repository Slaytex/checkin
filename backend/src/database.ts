import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../data', 'checkin.db');

export const db = new Database(dbPath);

// Type definitions for database rows
export interface DayRow {
  id: number;
  date: string;
  max_drinks: number;
  went_to_gym: number;
  created_at: string;
  updated_at: string;
}

export interface DrinkRow {
  id: number;
  day_id: number;
  drink_type: string;
  points: number;
  checked_off: number;
  created_at: string;
  updated_at: string;
}

export interface MealRow {
  id: number;
  day_id: number;
  meal_type: string;
  meal_name: string;
  created_at: string;
}

export interface CheatRow {
  id: number;
  date: string;
  drink_type: string;
  created_at: string;
}

export function initDatabase() {
  // Create days table
  db.exec(`
    CREATE TABLE IF NOT EXISTS days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      max_drinks INTEGER NOT NULL DEFAULT 0,
      went_to_gym INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add gym column to existing databases (migration)
  try {
    db.exec(`ALTER TABLE days ADD COLUMN went_to_gym INTEGER NOT NULL DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create drinks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS drinks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL,
      drink_type TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 1,
      checked_off INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
    )
  `);
  
  // Add points column to existing databases (migration)
  try {
    db.exec(`ALTER TABLE drinks ADD COLUMN points INTEGER NOT NULL DEFAULT 1`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add updated_at column to existing databases (migration)
  try {
    db.exec(`ALTER TABLE drinks ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Create meals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL,
      meal_type TEXT NOT NULL,
      meal_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
    )
  `);

  // Create cheats table (replaces cheat_log)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cheats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      drink_type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (date) REFERENCES days(date)
    )
  `);
  
  // Migration: Create cheats table if cheat_log exists
  try {
    const cheatLogExists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='cheat_log'`).get();
    if (cheatLogExists) {
      // Migrate data from cheat_log to cheats
      db.exec(`
        INSERT INTO cheats (date, drink_type, created_at)
        SELECT date, 'Beer', created_at FROM cheat_log
        WHERE NOT EXISTS (SELECT 1 FROM cheats WHERE cheats.date = cheat_log.date AND cheats.created_at = cheat_log.created_at)
      `);
    }
  } catch (e) {
    // Migration failed, continue
  }

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);
    CREATE INDEX IF NOT EXISTS idx_drinks_day_id ON drinks(day_id);
    CREATE INDEX IF NOT EXISTS idx_meals_day_id ON meals(day_id);
    CREATE INDEX IF NOT EXISTS idx_cheats_date ON cheats(date);
  `);

  console.log('Database initialized');
}

