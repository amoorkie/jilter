# Job Filter MVP Microservices Startup Script

Write-Host "🚀 Starting Job Filter MVP Microservices..." -ForegroundColor Green

# Проверяем наличие Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker is not installed. Please install Docker first." -ForegroundColor Red
    exit 1
}

# Проверяем наличие Docker Compose
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Создаем .env файл если его нет
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item "env.example" ".env"
    Write-Host "⚠️  Please edit .env file with your configuration before running again." -ForegroundColor Yellow
    exit 1
}

# Собираем и запускаем сервисы
Write-Host "🔨 Building and starting services..." -ForegroundColor Blue
docker-compose up --build -d

# Ждем запуска сервисов
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Проверяем статус сервисов
Write-Host "📊 Checking service status..." -ForegroundColor Blue
docker-compose ps

Write-Host "✅ Services started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Gateway: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Admin: http://localhost:3001" -ForegroundColor Cyan
Write-Host "⚡ Parser: http://localhost:8080" -ForegroundColor Cyan
Write-Host "🗄️  Database: http://localhost:8081" -ForegroundColor Cyan
Write-Host "📨 Queue: http://localhost:8082" -ForegroundColor Cyan
Write-Host "🔍 Search: http://localhost:8083" -ForegroundColor Cyan
Write-Host "🤖 AI: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 RabbitMQ Management: http://localhost:15672" -ForegroundColor Magenta
Write-Host "🔍 Elasticsearch: http://localhost:9200" -ForegroundColor Magenta
Write-Host ""
Write-Host "To stop services: docker-compose down" -ForegroundColor White
Write-Host "To view logs: docker-compose logs -f [service-name]" -ForegroundColor White







