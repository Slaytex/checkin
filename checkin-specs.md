CheckIn App - Complete Functional Specification

  Overview

  CheckIn is a personal accountability app for tracking gym visits and alcoholic drink consumption. The core
  concept: earn points by going to the gym, spend those points on drinks. The goal is to incentivize gym attendance
   while maintaining awareness of drinking habits.

  Core Mechanics

  1. Gym Check-In System

  - Daily Check-In: User can mark whether they went to the gym each day
  - Points Earned: Checking gym = 2 points earned for that day
  - Visual Feedback: When checked, shows "Great job! You earned 2 points today!" (NO emoji)
  - One-Time Per Day: Can check/uncheck the gym status for any given day

  2. Points System

  Point Earning Rules:

  - Base Rule: Go to gym = earn 2 points that day
  - Accumulation Rule (Mon-Thu):
    - If you go to the gym Monday-Thursday AND don't use any points on those days
    - Those points accumulate and become available on Friday-Sunday
    - Example: Go to gym Mon, Tue, Wed (no drinks) = 6 accumulated points available Fri-Sun

  Point Spending Rules:

  - Drink Slots: When you check "went to gym", you unlock drink slots for that day
  - Point Values: Different drink types cost different points (configurable):
    - Beer: 1 point
    - Wine: 1 point
    - Cocktail: 2 points
    - Shot: 1 point
    - (configurable via backend JSON)
  - Checking Off Drinks: When you check off a drink, it deducts points from your available pool
  - Unchecking: You can uncheck drinks to get points back
  - Cannot Exceed: You cannot check off more drinks than you have points for

  3. Cheat System

  When Cheat Button Appears:

  - Only shows when you've used ALL your earned points for the day (not counting accumulated)
  - Example: Earned 2 points today, used 2 points → cheat button appears

  Cheat Mechanics:

  - Cheat Types: When clicking cheat, user selects drink type (Beer, Wine, Cocktail, Shot)
  - Weekly Limit: Maximum 3 cheats per week (week starts Monday, ends Sunday)
  - Cheat Counter: Visual display shows X/3 cheats used this week
  - Cheat Meter: Red overlay fills the screen as you approach 3 cheats
  - Good Days Counter: Days where you went to gym but had 0 drinks
  - Visual Punishment:
    - At 3 cheats: screen gets red overlay
    - Each "good day" reduces the red opacity by 0.03
    - Formula: baseOpacity (0.3) - (goodDays × 0.03)

  4. Monthly Statistics

  - Display Location: Header of main page
  - Stats Shown:
    - Total drinks this month (count of all checked-off drinks)
    - Total gym visits this month (count of days marked "went to gym")
  - Monthly Summary Page:
    - Opens in NEW TAB (not replacing current view)
    - Shows detailed month-by-month breakdown
    - Calendar view or detailed stats (depends on implementation)

  Data Models

  Database Tables:

  days
  - id: INTEGER PRIMARY KEY
  - date: TEXT (YYYY-MM-DD format)
  - went_to_gym: INTEGER (0 or 1, boolean)
  - created_at: TEXT (timestamp)
  - updated_at: TEXT (timestamp)

  drinks
  - id: INTEGER PRIMARY KEY
  - day_id: INTEGER (foreign key to days.id)
  - drink_type: TEXT (Beer, Wine, Cocktail, Shot, etc.)
  - points: INTEGER (point value, based on type)
  - checked_off: INTEGER (0 or 1, boolean - whether drink was consumed)
  - created_at: TEXT (timestamp)
  - updated_at: TEXT (timestamp)

  cheats
  - id: INTEGER PRIMARY KEY
  - date: TEXT (YYYY-MM-DD)
  - drink_type: TEXT (Beer, Wine, Cocktail, Shot, etc.)
  - created_at: TEXT (timestamp)

  drink_types (configuration)
  - Stored in JSON file on backend
  - Format: { "Beer": 1, "Wine": 1, "Cocktail": 2, "Shot": 1 }

  API Endpoints

  Days

  - GET /api/days/today - Get today's date
  - GET /api/days/:date - Get specific day with drinks
  - PUT /api/days/:date/gym - Update gym status for a day

  Drinks

  - GET /api/drinks/types - Get configurable drink types with point values
  - GET /api/drinks/:date/points - Get points summary for a date
  - POST /api/drinks/:date/check-off - Check off a drink (spend points)
  - POST /api/drinks/:date/uncheck - Uncheck a drink (refund points)
  - PUT /api/drinks/:drinkId - Update drink type

  Cheats

  - GET /api/cheats/current - Get current week's cheat count
  - GET /api/cheats/good-days/current - Get current good days count
  - POST /api/cheats/:date - Record a cheat
  - GET /api/cheats/monthly/:year/:month - Get monthly stats (total drinks, gym days)

  Points Calculation Logic

  Points Summary Response:

  {
    earnedPoints: 2,              // Points earned today (2 if went to gym, 0 otherwise)
    accumulatedPoints: 6,         // Mon-Thu accumulated points (if applicable)
    totalAvailablePoints: 8,      // earnedPoints + accumulatedPoints
    usedPoints: 2,                // Points spent on checked-off drinks
    remainingPoints: 6            // totalAvailablePoints - usedPoints
  }

  Accumulation Logic:

  1. Check if today is Fri, Sat, or Sun
  2. If yes, look at Mon-Thu of this week
  3. For each day Mon-Thu:
    - Did user go to gym? (+2 points)
    - Did user check off ANY drinks? (disqualified, points don't accumulate)
  4. Sum up accumulated points from eligible days
  5. Add to today's earned points

  UI Components

  Main App (App.jsx)

  - Manages global state
  - Fetches initial data
  - Passes props to child components
  - Handles data refresh after actions
  - Shows cheat meter overlay
  - Renders header with monthly stats

  TodayView Component

  Props:
  - day - Day object with date, went_to_gym, drinks array
  - drinkTypes - Object mapping drink type names to point values
  - pointsSummary - Points calculation object
  - onDrinkCheckOff - Function to check off a drink
  - onDrinkUncheck - Function to uncheck a drink
  - onDrinkTypeUpdate - Function to change drink type
  - onGymUpdate - Function to update gym status
  - onCheat - Function to open cheat dialog

  Displays:
  - Current date (formatted: "Wednesday, November 6, 2025")
  - Gym checkbox with "💪 Went to the Gym"
  - Success message when gym checked (NO CHECKMARK EMOJI)
  - Points summary breakdown
  - List of drink slots (if gym checked)
  - Each drink: checkbox, type selector, point value
  - Cheat button (when eligible)

  CheatMeter Component

  Props:
  - cheatCount - Number of cheats this week (0-3)
  - maxCheats - Maximum cheats (always 3)

  Displays:
  - Visual indicator of cheats (3 dots/circles)
  - Shows which cheats are used vs available
  - Positioned as fixed overlay

  CheatDialog Component

  Props:
  - onSubmit - Function called with selected drink type
  - onCancel - Function to close dialog

  Displays:
  - Modal overlay
  - "Select drink type" prompt
  - Buttons for each drink type (Beer, Wine, Cocktail, Shot)
  - Cancel button

  MonthlySummary Component

  - Separate page (summary.html)
  - Takes year/month from URL query params
  - Shows monthly breakdown
  - Calendar view or detailed stats

  Business Rules Summary

  1. No gym = no drink slots - Checking gym is required to unlock drinks
  2. Cannot overspend points - UI should prevent checking drinks without points
  3. Accumulation only Mon-Thu - Weekend doesn't accumulate to next week
  4. Accumulation requires zero drinks - Even one drink disqualifies that day
  5. 3 cheats maximum per week - Week = Monday-Sunday
  6. Good days reduce red screen - Visual feedback for recovery
  7. Monthly stats are read-only - Just display, no editing
  8. All dates use YYYY-MM-DD format - For database consistency
  9. Times are local - No timezone complications needed

  Technical Stack

  Frontend:
  - Plain JavaScript (NO TypeScript)
  - React 18 with hooks
  - Vite as build tool
  - date-fns for date formatting
  - Inline styles (no CSS files)
  - Dark theme (#1a1a1a background, #2a2a2a cards, #ffffff text)
  - Montserrat font family

  Backend:
  - Node.js + Express
  - TypeScript (keep as-is, don't change)
  - SQLite database
  - Port 3003

  Deployment:
  - Frontend built to /var/www/checkin/frontend/dist
  - Nginx serves static files
  - Vite dev proxy for /api routes during development

  Critical Requirements

  1. NO EMOJIS in dynamic text - Emojis in labels are OK (💪, 🍺), but NOT in generated messages
  2. Monthly Summary opens NEW TAB - Never replace current view
  3. Build must not cache - Plain JS build should be clean every time
  4. All functionality must work - Gym check, drink check, points, cheats, stats
  5. Mobile responsive - Works on phone screens
  6. Hard refresh not required - Changes should appear immediately after build

  Current Issues to Fix

  - TodayView component has wrong props interface
  - Component expects stats, onGymCheckIn, onDrinkAction
  - Should expect day, drinkTypes, pointsSummary, onDrinkCheckOff, onDrinkUncheck, onDrinkTypeUpdate, onGymUpdate,
  onCheat