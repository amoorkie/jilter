#!/bin/bash

echo "🚀 Starting Job Filter MVP Microservices..."

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration before running again."
    exit 1
fi

# Собираем и запускаем сервисы
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Ждем запуска сервисов
echo "⏳ Waiting for services to start..."
sleep 30

# Проверяем статус сервисов
echo "📊 Checking service status..."
docker-compose ps

echo "✅ Services started successfully!"
echo ""
echo "🌐 Gateway: http://localhost:3000"
echo "🔧 Admin: http://localhost:3001"
echo "⚡ Parser: http://localhost:8080"
echo "🗄️  Database: http://localhost:8081"
echo "📨 Queue: http://localhost:8082"
echo "🔍 Search: http://localhost:8083"
echo "🤖 AI: http://localhost:5000"
echo ""
echo "📊 RabbitMQ Management: http://localhost:15672"
echo "🔍 Elasticsearch: http://localhost:9200"
echo ""
echo "To stop services: docker-compose down"
echo "To view logs: docker-compose logs -f [service-name]"







