# CheckIn - Daily Meal & Drink Tracker

A full-stack web application to help track and manage daily meals and drinks, with intelligent drink redistribution logic and gym-based motivation system.

## Features

### 🍺 Drink Tracking & Redistribution
- **Gym-Based Drink Allocation**: Monday-Thursday allow 2 drinks maximum
  - **Went to Gym**: Earn 2 drinks per day
  - **No Gym**: Get 1 drink per day
- **Intelligent Redistribution**: 
  - Unused drinks from gym days automatically move to the next day
  - Unused drinks from non-gym days are lost (don't move forward)
  - If a day already has its maximum drinks, excess continues forward
  - Any remaining excess drinks are split between Friday, Saturday, and Sunday

### 💪 Gym Tracking
- Mark which days you went to the gym
- Visual feedback showing your earned drinks
- Plan your week by marking gym days in advance

### 🚨 Cheat System
- **"I Cheated" Button**: Appears only after consuming all your allowed drinks for the day
- **Red Meter**: Visual progress bar at the top showing cheats used (0-3 per week)
- **Background Warning**: App turns red when you reach 3 cheats
- **Redemption**: Background redness diminishes as you have "good days" (days where you drink less than your allowance)
- **Weekly Limit**: Maximum 3 cheats per week (Monday-Sunday)

### 📅 Planning
- **Today View**: Quick access to today's date with drink tracking and gym status
- **Week Planning**: Plan your entire week's gym schedule and view drink availability

## How It Works

### Daily Workflow

1. **Mark Gym Status**: Check the box if you went to the gym today
   - Gym = 2 drinks available
   - No Gym = 1 drink available

2. **Track Your Drinks**: Check off drinks as you consume them
   - Available drinks are shown based on gym status
   - Unused drinks from gym days move to tomorrow

3. **Cheat System** (if you consume all your drinks):
   - After all drinks are consumed, the "I Cheated" button appears
   - Clicking it records a cheat (max 3 per week)
   - Red meter fills up as cheats are recorded
   - Background turns red at 3 cheats
   - Good days (drinking less than allowance) reduce the red background

### Example Scenario

**Monday**: 
- Went to gym → 2 drinks available
- Consumed 1 drink → 1 unused drink moves to Tuesday

**Tuesday**: 
- No gym → 1 drink available (but gets 1 from Monday = 2 total)
- Consumed 1 drink → 1 unused drink moves to Wednesday

**Wednesday**: 
- Went to gym → 2 drinks available (but gets 1 from Tuesday = 3 total)
- Since max is 2, 1 drink pushes to Thursday

**Thursday**: 
- No gym → 1 drink available (but gets 1 from Wednesday = 2 total)
- Since max is 1, 1 drink pushes forward

**Weekend**: 
- Any remaining excess drinks are split between Friday, Saturday, and Sunday

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite

## Development Setup

1. Install dependencies:
```bash
npm run install:all
```

2. Start the development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3003
- Frontend server on http://localhost:3000 (Vite dev server)

## Production Deployment (Ubuntu + Nginx)

### Prerequisites
- Ubuntu 20.04+ (or similar Linux distribution)
- Node.js 18+ and npm installed
- Nginx installed
- Git installed

### Step 1: Clone and Build on Development Machine

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd checkin
   git checkout checkinv2  # or your desired branch
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   cd ..
   ```

4. **Build the backend:**
   ```bash
   cd backend
   npm run build
   cd ..
   ```

### Step 2: Transfer Files to Server

1. **Create deployment directory on server:**
   ```bash
   ssh user@your-server
   sudo mkdir -p /var/www/checkin/{frontend,backend}
   sudo chown -R $USER:$USER /var/www/checkin
   ```

2. **Transfer files (from your local machine):**
   ```bash
   # Transfer frontend build
   scp -r frontend/dist/* user@your-server:/var/www/checkin/frontend/
   
   # Transfer backend files
   scp -r backend/dist user@your-server:/var/www/checkin/backend/
   scp backend/package.json user@your-server:/var/www/checkin/backend/
   scp backend/package-lock.json user@your-server:/var/www/checkin/backend/
   scp backend/drink_types.json user@your-server:/var/www/checkin/backend/
   scp backend/tsconfig.json user@your-server:/var/www/checkin/backend/
   
   # Create data directory for SQLite database
   ssh user@your-server "mkdir -p /var/www/checkin/backend/data"
   ```

### Step 3: Install Backend Dependencies on Server

```bash
ssh user@your-server
cd /var/www/checkin/backend
npm install --production
```

### Step 4: Configure Nginx

1. **Copy nginx configuration:**
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/checkin
   ```

2. **Edit the configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/checkin
   ```
   - Update `server_name` with your domain or IP address
   - Verify `proxy_pass` points to `http://localhost:3003` (backend port)

3. **Enable the site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/checkin /etc/nginx/sites-enabled/
   ```

4. **Test and reload:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Step 5: Set Up Systemd Service

1. **Copy systemd service file:**
   ```bash
   sudo cp backend/systemd.service /etc/systemd/system/checkin-backend.service
   ```

2. **Edit the service file (if needed):**
   ```bash
   sudo nano /etc/systemd/system/checkin-backend.service
   ```
   - Verify `WorkingDirectory` is `/var/www/checkin/backend`
   - Verify `ExecStart` points to the correct Node.js path
   - Verify `Environment=PORT=3003` matches your backend port

3. **Reload systemd and start the service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable checkin-backend
   sudo systemctl start checkin-backend
   ```

4. **Check service status:**
   ```bash
   sudo systemctl status checkin-backend
   ```

### Step 6: Set Permissions

```bash
sudo chown -R www-data:www-data /var/www/checkin
sudo chmod -R 755 /var/www/checkin
sudo chmod -R 775 /var/www/checkin/backend/data  # For SQLite database
```

### Step 7: Verify Deployment

1. **Check backend is running:**
   ```bash
   curl http://localhost:3003/api/health
   ```

2. **Check nginx is serving frontend:**
   ```bash
   curl http://your-domain-or-ip/
   ```

3. **Check logs if issues:**
   ```bash
   # Backend logs
   sudo journalctl -u checkin-backend -f
   
   # Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

### Important Notes

- **Backend Port**: The backend runs on port **3003** by default
- **Database**: SQLite database is stored in `/var/www/checkin/backend/data/checkin.db`
- **Environment Variables**: Backend uses `PORT` environment variable (defaults to 3003)
- **Firewall**: Ensure ports 80 (HTTP) and 443 (HTTPS if using SSL) are open
- **SSL/HTTPS**: Consider setting up Let's Encrypt SSL certificate for production

### Updating the Application

1. **Pull latest changes:**
   ```bash
   cd /path/to/checkin
   git pull
   ```

2. **Rebuild:**
   ```bash
   cd frontend && npm run build && cd ..
   cd backend && npm run build && cd ..
   ```

3. **Transfer new files to server** (repeat Step 2)

4. **Restart services:**
   ```bash
   ssh user@your-server
   sudo systemctl restart checkin-backend
   sudo systemctl reload nginx
   ```

## Project Structure

```
checkin/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server entry point
│   │   ├── database.ts       # Database initialization
│   │   └── routes/           # API routes
│   │       ├── days.ts       # Day management
│   │       ├── drinks.ts     # Drink tracking & redistribution
│   │       ├── meals.ts      # Meal planning
│   │       └── cheats.ts     # Cheat tracking
│   └── data/                 # SQLite database files
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main app component
│   │   ├── components/       # React components
│   │   │   ├── TodayView.tsx
│   │   │   ├── PlanningView.tsx
│   │   │   └── CheatMeter.tsx
│   │   └── types.ts          # TypeScript types
└── package.json              # Workspace configuration
```

## API Endpoints

### Days
- `GET /api/days/today` - Get today's date
- `GET /api/days/:date` - Get day information (including drinks, meals, gym status)
- `PUT /api/days/:date/max-drinks` - Update max drinks for a day
- `PUT /api/days/:date/gym` - Update gym status for a day

### Drinks
- `POST /api/drinks/:date/check-off` - Check off a drink (consumed)
- `POST /api/drinks/:date/uncheck` - Uncheck a drink
- `PUT /api/drinks/:drinkId` - Update drink type

### Meals
- `GET /api/meals/:date` - Get meals for a day
- `POST /api/meals/:date` - Add a meal
- `PUT /api/meals/:mealId` - Update a meal
- `DELETE /api/meals/:mealId` - Delete a meal

### Cheats
- `GET /api/cheats/current` - Get current week cheat count
- `GET /api/cheats/week/:weekStart` - Get cheat count for a specific week
- `POST /api/cheats/:date` - Record a cheat for a date
- `GET /api/cheats/good-days/current` - Get count of good days (days with less than allowance)

## Database Schema

### Days
- `id`: Primary key
- `date`: Date (YYYY-MM-DD format)
- `max_drinks`: Maximum drinks allowed (default: 2 for Monday-Thursday)
- `went_to_gym`: Boolean (1 = went to gym, 0 = didn't go)
- `created_at`, `updated_at`: Timestamps

### Drinks
- `id`: Primary key
- `day_id`: Foreign key to days
- `drink_type`: Type of drink (e.g., "Beer")
- `checked_off`: Boolean (1 = consumed, 0 = not consumed)
- `created_at`: Timestamp

### Meals
- `id`: Primary key
- `day_id`: Foreign key to days
- `meal_type`: Type of meal (e.g., "Breakfast", "Lunch", "Dinner")
- `meal_name`: Name of the meal
- `created_at`: Timestamp

### Cheat Log
- `id`: Primary key
- `date`: Date of the cheat
- `week_start`: Start of the week (Monday) for tracking weekly limits
- `created_at`: Timestamp

## License

MIT
