# Тестирование всех сервисов
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Job Filter MVP - Тест сервисов" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка портов
Write-Host "1. Проверка портов..." -ForegroundColor Yellow
$ports = @(3000, 3002, 5000, 8080, 8081)
foreach ($port in $ports) {
    $result = netstat -ano | findstr ":$port"
    if ($result) {
        Write-Host "  Порт $port: ЗАНЯТ" -ForegroundColor Green
    } else {
        Write-Host "  Порт $port: СВОБОДЕН" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. Тестирование Next.js Gateway..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microservices/health" -Method GET
    Write-Host "  Next.js Gateway: РАБОТАЕТ" -ForegroundColor Green
    Write-Host "  Сервисов доступно: $($response.services.Count)" -ForegroundColor White
} catch {
    Write-Host "  Next.js Gateway: НЕ РАБОТАЕТ" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Тестирование Java Parser..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET
    Write-Host "  Java Parser: РАБОТАЕТ" -ForegroundColor Green
    Write-Host "  Статус: $($response.status)" -ForegroundColor White
} catch {
    Write-Host "  Java Parser: НЕ РАБОТАЕТ" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Тестирование парсинга..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microservices/parse" -Method POST -Body '{"sources":["geekjob"],"query":"дизайнер","pages":1}' -ContentType "application/json"
    Write-Host "  Парсинг: РАБОТАЕТ" -ForegroundColor Green
    Write-Host "  Результатов: $($response.results.Count)" -ForegroundColor White
} catch {
    Write-Host "  Парсинг: НЕ РАБОТАЕТ" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Тестирование завершено" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Откройте браузер и перейдите по адресу:" -ForegroundColor Green
Write-Host "  http://localhost:3000/admin" -ForegroundColor White
Write-Host ""
Write-Host "Нажмите любую клавишу для выхода..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")





