@echo off
echo Starting all microservices...

echo Starting Database Service...
start "Database Service" cmd /k "cd microservices\database-service && npm install && npm start"

echo Starting AI Service...
start "AI Service" cmd /k "cd microservices\ai-service && npm install && npm start"

echo Starting Admin Service...
start "Admin Service" cmd /k "cd microservices\admin-service && npm start"

echo All services starting...
echo Check the opened windows for service status.
pause


