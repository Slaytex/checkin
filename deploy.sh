#!/bin/bash

# Deployment script for Ubuntu server with nginx

echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Building backend..."
cd backend
npm install
npm run build
cd ..

echo "Setup complete! Next steps:"
echo "1. Copy the frontend/dist folder to /var/www/checkin/frontend/"
echo "2. Copy the backend/dist folder and backend/package.json to your server"
echo "3. Install backend dependencies: cd backend && npm install --production"
echo "4. Copy nginx.conf to /etc/nginx/sites-available/checkin"
echo "5. Create symlink: sudo ln -s /etc/nginx/sites-available/checkin /etc/nginx/sites-enabled/"
echo "6. Test nginx: sudo nginx -t"
echo "7. Restart nginx: sudo systemctl restart nginx"
echo "8. Set up systemd service for backend (see systemd.service file)"
echo "9. Start backend: sudo systemctl start checkin-backend"

