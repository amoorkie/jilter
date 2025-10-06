@echo off
echo ========================================
echo    Job Filter MVP - Запуск сервисов
echo ========================================
echo.

echo Проверка статуса портов...
netstat -ano | findstr ":3000 :3002 :5000 :8080 :8081"

echo.
echo Запуск Java Parser Service...
start "Java Parser Service" cmd /k ".\run_fixed_java.bat"

echo.
echo Запуск Database Service...
start "Database Service" cmd /k "node simple_database_service.js"

echo.
echo Запуск AI Service...
start "AI Service" cmd /k "node simple_ai_service.js"

echo.
echo Запуск Admin Service...
start "Admin Service" cmd /k "node simple_admin_service.js"

echo.
echo Запуск Next.js Gateway...
start "Next.js Gateway" cmd /k "npm run dev"

echo.
echo ========================================
echo    Все сервисы запускаются...
echo ========================================
echo.
echo Откройте браузер и перейдите по адресу:
echo   http://localhost:3000/admin
echo.
echo Статус сервисов:
echo   - Next.js Gateway: http://localhost:3000
echo   - Admin Service: http://localhost:3002
echo   - AI Service: http://localhost:5000
echo   - Java Parser: http://localhost:8080
echo   - Database Service: http://localhost:8081
echo.
echo Нажмите любую клавишу для выхода...
pause > nul





