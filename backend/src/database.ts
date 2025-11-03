import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../data', 'checkin.db');

export const db = new Database(dbPath);

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
      consumed INTEGER NOT NULL DEFAULT 0,
      checked_off INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
    )
  `);

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

  // Create cheat_log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cheat_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      week_start TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (date) REFERENCES days(date)
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_days_date ON days(date);
    CREATE INDEX IF NOT EXISTS idx_drinks_day_id ON drinks(day_id);
    CREATE INDEX IF NOT EXISTS idx_meals_day_id ON meals(day_id);
    CREATE INDEX IF NOT EXISTS idx_cheat_log_date ON cheat_log(date);
    CREATE INDEX IF NOT EXISTS idx_cheat_log_week ON cheat_log(week_start);
  `);

  console.log('Database initialized');
}

