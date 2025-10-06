# Тестирование Go парсеров

Write-Host "🧪 Тестирование Go парсеров..." -ForegroundColor Blue

# Переходим в директорию парсеров
Set-Location "parser-service"

# Проверяем, что Go установлен
if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Go не установлен. Установите Go и попробуйте снова." -ForegroundColor Red
    exit 1
}

# Инициализируем модуль
Write-Host "📦 Инициализация Go модуля..." -ForegroundColor Yellow
go mod init job-filter-parser-service

# Скачиваем зависимости
Write-Host "⬇️ Скачивание зависимостей..." -ForegroundColor Yellow
go mod tidy

# Проверяем синтаксис
Write-Host "🔍 Проверка синтаксиса..." -ForegroundColor Yellow
go vet ./...

# Запускаем тесты
Write-Host "🧪 Запуск тестов..." -ForegroundColor Yellow
go test ./...

# Собираем приложение
Write-Host "🔨 Сборка приложения..." -ForegroundColor Yellow
go build -o parser-service.exe .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Парсер успешно собран!" -ForegroundColor Green
    
    # Запускаем парсер
    Write-Host "🚀 Запуск парсера..." -ForegroundColor Blue
    Write-Host "Парсер будет доступен на http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Для остановки нажмите Ctrl+C" -ForegroundColor Yellow
    
    # Запускаем в фоновом режиме
    Start-Process -FilePath ".\parser-service.exe" -WindowStyle Hidden
    
    # Ждем немного
    Start-Sleep -Seconds 3
    
    # Тестируем health check
    Write-Host "🔍 Тестирование health check..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/health" -Method GET
        Write-Host "✅ Health check успешен: $($response | ConvertTo-Json)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Health check не прошел: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Тестируем парсинг Geekjob
    Write-Host "🔍 Тестирование парсинга Geekjob..." -ForegroundColor Yellow
    try {
        $body = @{
            query = "дизайнер"
            pages = 1
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/geekjob" -Method POST -Body $body -ContentType "application/json"
        Write-Host "✅ Парсинг Geekjob успешен: $($response | ConvertTo-Json)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Парсинг Geekjob не прошел: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Тестируем парсинг HH.ru
    Write-Host "🔍 Тестирование парсинга HH.ru..." -ForegroundColor Yellow
    try {
        $body = @{
            query = "дизайнер"
            pages = 1
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/hh" -Method POST -Body $body -ContentType "application/json"
        Write-Host "✅ Парсинг HH.ru успешен: $($response | ConvertTo-Json)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Парсинг HH.ru не прошел: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Тестируем парсинг Habr
    Write-Host "🔍 Тестирование парсинга Habr..." -ForegroundColor Yellow
    try {
        $body = @{
            query = "дизайнер"
            pages = 1
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:8080/api/parse/habr" -Method POST -Body $body -ContentType "application/json"
        Write-Host "✅ Парсинг Habr успешен: $($response | ConvertTo-Json)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Парсинг Habr не прошел: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Останавливаем парсер
    Write-Host "🛑 Остановка парсера..." -ForegroundColor Yellow
    Get-Process -Name "parser-service" -ErrorAction SilentlyContinue | Stop-Process -Force
    
} else {
    Write-Host "❌ Ошибка сборки парсера" -ForegroundColor Red
}

# Возвращаемся в корневую директорию
Set-Location ".."

Write-Host "🎉 Тестирование завершено!" -ForegroundColor Green







